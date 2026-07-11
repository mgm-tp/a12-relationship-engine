/* Migration-step registry. Manually maintained after departing from migrationtool-utils auto-generation. */
import type { MigrationStep } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionIsMigrated, extractionTransform } from "./RuM/extraction/index.js";
import { LEGACY_BINDING_FORM_MODEL_VERSION, RUM_VERSION } from "./RuM/extraction/versions.js";

export const MIGRATION_STEPS: MigrationStep[] = [
	{
		version: LEGACY_BINDING_FORM_MODEL_VERSION,
		schema: true
	},
	{
		version: RUM_VERSION,
		schema: true,
		isMigrated: extractionIsMigrated,
		transform: extractionTransform
	}
];
