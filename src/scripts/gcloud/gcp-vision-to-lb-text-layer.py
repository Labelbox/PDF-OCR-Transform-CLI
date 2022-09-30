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
with open(sys.argv[1], 'r') as file:
    input_json = json.loads(file.read())
    text_layer = []

    # Map the GCP OCR format into Labelbox's text layer format
    for response in input_json['responses']:
        page_number = response['context']['pageNumber']
        for page in response['fullTextAnnotation']['pages']:
            def map_page(page):
                def map_group(group):
                    def map_token(token):
                        return {
                            'id': str(uuid.uuid4()),
                            'geometry': map_geometry(token['boundingBox']['normalizedVertices']),
                            'content': ''
                        }

                    def reduce_paragraphs(paragraph_list: list, paragraph):
                        paragraph_list.append(paragraph)
                        return paragraph_list

                    return {
                        'id': str(uuid.uuid4()),
                        'content': '',
                        'geometry': map_geometry(group['boundingBox']['normalizedVertices']),
                        'tokens': []
                    }

                return {
                    'width': page['width'],
                    'height': page['height'],
                    'number': page_number,
                    'units': 'PERCENT',
                    'groups': list(map(map_group, page['blocks']))
                }

            text_layer.append(map_page(page))

    text_layer_file: FileIO = open(
        filename_without_extension + '-lb-text-layer.json', 'w')
    text_layer_file.write(json.dumps(text_layer))
    text_layer_file.close()
