#!/usr/bin/python

from io import FileIO
import json
import sys
import re
import uuid
import functools

# Command line params <gcp_ocr_json_filepath>

print('gcp_ocr_json_filepath', sys.argv)

input_filename = sys.argv[1]

if (not input_filename.endswith('.json')):
    raise Exception('The input gpc ocr file must be a json file')

filename_without_extension = re.search('.*(?=\.json)', sys.argv[1])[0]


def map_geometry(normalized_verticies: list):
    return {
        'left': normalized_verticies[0]['x'],
        'top': normalized_verticies[0]['y'],
        'width': normalized_verticies[2]['x'] - normalized_verticies[0]['x'],
        'height': normalized_verticies[2]['y'] - normalized_verticies[0]['y'],
    }


# Open the GCP OCR output JSON file
with open(input_filename, 'r') as file:
    input_json = json.loads(file.read())
    text_layer = []

    # Map the GCP OCR format into Labelbox's text layer format
    for response in input_json['responses']:
        page_number = response['context']['pageNumber']
        for page in response['fullTextAnnotation']['pages']:
            def map_page(page):
                def map_paragraph_to_group(paragraph):
                    def map_word_to_token(word):
                        return {
                            'id': str(uuid.uuid4()),
                            'geometry': map_geometry(word['boundingBox']['normalizedVertices']),
                            'content': functools.reduce(lambda token_content, symbol: token_content + symbol['text'], word['symbols'], '')
                        }

                    # Extract all symbols in the paragraph to construct the group's content
                    content = ''
                    for word in paragraph['words']:
                        for symbol in word['symbols']:
                            content += symbol['text']
                            if (symbol.get('property') is not None and symbol['property'].get('detectedBreak') is not None):
                                if (symbol['property']['detectedBreak']['type'] == 'SPACE'):
                                    content = content + ' '
                                if (symbol['property']['detectedBreak']['type'] == 'HYPHEN'):
                                    content += '-'
                                if (symbol['property']['detectedBreak']['type'] == 'LINE_BREAK'):
                                    content += '\n'

                    return {
                        'id': str(uuid.uuid4()),
                        'content': content,
                        'geometry': map_geometry(paragraph['boundingBox']['normalizedVertices']),
                        'tokens': list(map(map_word_to_token, paragraph['words']))
                    }

                    # group['content'] = functools.reduce(
                    #     lambda group_content, token: group_content + token['content'] + ' ', group['tokens'], '').strip()

                    # return group

                def reduce_blocks_to_paragraphs(paragraphs: list, block):
                    return paragraphs + block['paragraphs']

                # Extract the paragraphs from all blocks on the page
                paragraphs = functools.reduce(
                    reduce_blocks_to_paragraphs, page['blocks'], [])

                return {
                    'width': page['width'],
                    'height': page['height'],
                    'number': page_number,
                    'units': 'PERCENT',
                    'groups': list(map(map_paragraph_to_group, paragraphs)),
                }

            text_layer.append(map_page(page))

    text_layer_file: FileIO = open(
        filename_without_extension + '-lb-text-layer.json', 'w')
    text_layer_file.write(json.dumps(text_layer))
    text_layer_file.close()
