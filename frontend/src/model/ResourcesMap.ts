import { ExternalResource } from "./ExternalResource.model";
import { GlobalResource } from "./GlobalResource.model";
import { Moodle } from "./Moodle.model";
import { Signet } from "./Signet.model";
import { Textbook } from "./Textbook.model";
export interface ResourcesMap {
  textbooks: Textbook[];
  externalResources: ExternalResource[];
  moodle: Moodle[];
  signets: Signet[];
  global: GlobalResource[];
}
