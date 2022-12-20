import Ajv from "ajv";
import schema from "./text-layer-validation-model.json";
import fs from "fs";

const ajv = new Ajv();

const areGroupIdsUnique = (textLayer: any) => {
  const groupIds: string[] = textLayer.reduce(
    (groupIds, page) => [...groupIds, ...page.groups.map(({ id }) => id)],
    []
  );

  return new Set(groupIds).size === groupIds.length;
};

const areTokenIdsUnique = (textLayer: any) => {
  const groupIds = textLayer.reduce(
    (tokenIds, page) => [
      ...tokenIds,
      ...page.groups.reduce(
        (agg, group) => [...agg, ...group.tokens.map(({ id }) => id)],
        []
      ),
    ],
    []
  );

  return new Set(groupIds).size === groupIds.length;
};

const validate = (textLayer: any): string[] => {
  const validateSchema = ajv.compile(schema);

  try {
    if (!validateSchema(textLayer)) {
      return validateSchema.errors?.map((error) => JSON.stringify(error)) || [];
    }

    if (!areGroupIdsUnique(textLayer)) {
      return ["Group ids are not unique"];
    }

    if (!areTokenIdsUnique(textLayer)) {
      return ["Token ids are not unique"];
    }

    return [];
  } catch (e) {
    return ["Something went wrong"];
  }
};

export const validateTextLayer = (textLayerFilepath: string) => {
  try {
    const data = JSON.parse(fs.readFileSync(textLayerFilepath).toString());

    return validate(data);
  } catch (err) {
    console.log(
      `*** An error occurred validating the text layer at filepath: ${textLayerFilepath} ***`
    );
    console.log(err);
  }
};
