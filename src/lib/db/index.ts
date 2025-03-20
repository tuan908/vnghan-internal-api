import { screwMaterials } from "./schema/material";
import { screws } from "./schema/screw";
import { screwSizes } from "./schema/size";
import { screwTypes } from "./schema/type";

const SCHEMA = {
  SCREW: screws,
  SCREW_TYPE: screwTypes,
  SCREW_SIZE: screwSizes,
  SCREW_MATERIAL: screwMaterials
}

export default SCHEMA