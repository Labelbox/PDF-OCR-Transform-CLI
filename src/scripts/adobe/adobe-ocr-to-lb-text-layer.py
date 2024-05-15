import json
import uuid
import os
import shutil
from os import listdir
import re

OUTPUT_FOLDER_PATH = 'output'

# Delete the output folder if it exists
if os.path.exists(OUTPUT_FOLDER_PATH):
    shutil.rmtree(OUTPUT_FOLDER_PATH)

# Create the output directory
os.mkdir(OUTPUT_FOLDER_PATH)

# All files in the script's directory
all_files = listdir('./')

def filter_json_files(filename):
    return re.search('.*\.json$', filename)

# All json files in the script's directory
json_files = list(filter(filter_json_files, all_files)) 

# Transform each Adobe .JSON file the directory into the Labelbox custom text format and place the result in the /output folder
for json_filename in json_files:
    lb_custom_text_layer_output = []
    file = open(json_filename)
    json_content = json.load(file)

    for page in json_content['pages']:
        pageObj = {
            'width': page['width'],
            'height': page['height'],
            'number': page['page_number'] + 1, # Page index vs page number? 
            "units": "POINTS",
            "groups": [],
        }
        lb_custom_text_layer_output.append(pageObj)

    for element in json_content['elements']:
        if 'Bounds' not in element or 'Text' not in element:
            continue

        bounds = element['Bounds']
        text = element["Text"]
        typography = element['Font']
        
        page_width = 0
        page_height = 0
        page_left_origin = 0
        page_bottom_origin = 0
        
        for page in json_content['pages']:
            if page['page_number'] == element['Page']:
                page_width = page['width']
                page_height = page['height']
                
                # L,B,R,T bounds of page CropBox
                page_crop_box = page['boxes'].get('CropBox', [0, 0])
                page_left_origin = page_crop_box[0]
                page_bottom_origin = page_crop_box[1]

        [left, right] = [c - page_left_origin for c in bounds[0:3:2]]
        [bottom, top] = [c - page_bottom_origin for c in bounds[1:4:2]]

        height = abs(top - bottom)
        width = abs(right - left)
        
        top = abs(top - page_height)
        
        group = {
            "id": str(uuid.uuid4()),
            "content": text,
            "geometry": {
            "left": left,
            "top": top,
            "width": width,
            "height": height,
            },
            "typography": {
                "fontSize": element['TextSize'],
                "fontFamily": typography['font_type'],
            },
            "tokens": [],
        }
        
        for i in range(len(element['CharBounds'])):
            tokenList = element['CharBounds']
            tokenValue = element['CharBounds'][i]
            [left, right] = [c - page_left_origin for c in tokenValue[0:3:2]]
            [bottom, top] = [c - page_bottom_origin for c in tokenValue[1:4:2]]
            
            height = abs(top - bottom)
            width = abs(right - left)
            
            top = page_height - top

            token = {
            "geometry": {
                "left": left,
                "top": top,
                "width": width,
                "height": height,
            },
            "content": text[i],
            "id": str(uuid.uuid4()),
            }
            
            group['tokens'].append(token)
        
        page = element['Page']
        lb_custom_text_layer_output[page]['groups'].append(group)

    output_filename = '{}-lb-custom-text-layer.json'.format(json_filename.split('.json')[0])
    output_filepath = '{}/{}'.format(OUTPUT_FOLDER_PATH, output_filename)
    output_file = open(output_filepath, 'w')
    print('writing file {}'.format(output_filepath))
    output_file.write(json.dumps(lb_custom_text_layer_output))