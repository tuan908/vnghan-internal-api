import { screwMaterials } from "./schema/material";
import { screws } from "./schema/screw";
import { screwSizes } from "./schema/size";
import { screwTypes } from "./schema/type";

const DbSchema = {
  Screw: screws,
  ScrewType: screwTypes,
  ScrewSize: screwSizes,
  ScrewMaterial: screwMaterials
}

export default DbSchema