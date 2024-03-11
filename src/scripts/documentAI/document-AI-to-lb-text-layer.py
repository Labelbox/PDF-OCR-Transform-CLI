from io import FileIO
import json
import sys
import re
import uuid

input_filename = sys.argv[1]

if (not input_filename.endswith('.json')):
    raise Exception('The input document AI ocr file must be a json file')

filename_without_extension = re.search('.*(?=\.json)', sys.argv[1])[0]


def map_geometry(normalized_verticies: list):
    return {
        'left': min(normalized_verticies, key=lambda x: x['x'])["x"],
        'top': min(normalized_verticies, key=lambda x: x['y'])["y"],
        'width': max(normalized_verticies, key=lambda x: x['x'])["x"] - min(normalized_verticies, key=lambda x: x['x'])["x"],
        'height': max(normalized_verticies, key=lambda x: x['y'])["y"] - min(normalized_verticies, key=lambda x: x['y'])["y"],
    }


with open(input_filename, 'r') as file:
    # Put document AI JSON file url here
    input_json = json.loads(file.read())
    text_layer = []

    for page in input_json['pages']:
        page_number = page['pageNumber']

        def map_page(page):
            def map_line_to_group(page):
                def map_word_to_token(tokens, line_end_index):
                    words = []
                    for token in tokens:
                        try:
                            start_index = int(token["layout"]["textAnchor"]["textSegments"][0]["startIndex"])
                        except:
                            start_index = 0
                        end_index = int(token["layout"]["textAnchor"]["textSegments"][0]["endIndex"])
                        if line_end_index <= end_index:
                            return words
                        content = input_json["text"][start_index: end_index]
                        words.append({
                            'id': str(uuid.uuid4()),
                            'geometry': map_geometry(token["layout"]['boundingPoly']['normalizedVertices']),
                            'content': content.rstrip()
                        })

                lines = []
                for line in page["lines"]:
                    try:
                        line_start_index = int(line["layout"]["textAnchor"]["textSegments"][0]["startIndex"])
                    except:
                        line_start_index = 0

                    line_end_index = int(line["layout"]["textAnchor"]["textSegments"][0]["endIndex"])
                    content = input_json["text"][line_start_index:line_end_index]
                    lines.append({
                    'id': str(uuid.uuid4()),
                    'content': content.rstrip(),
                    'geometry': map_geometry(line["layout"]['boundingPoly']['normalizedVertices']),
                    'tokens': map_word_to_token(page["tokens"], int(line["layout"]["textAnchor"]["textSegments"][0]["endIndex"]))
                    })
                return lines

            return {
                'width': page["dimension"]['width'],
                'height': page["dimension"]['height'],
                'number': page_number,
                'units': 'PERCENT',
                'groups': map_line_to_group(page),
            }

        text_layer.append(map_page(page))

    text_layer_file: FileIO = open(
        filename_without_extension + '-lb-text-layer.json', 'w')
    text_layer_file.write(json.dumps(text_layer))
    text_layer_file.close()