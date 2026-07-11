package com.mgmtp.a12.relationshipengine.showcase.converters;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Post-processing CLI for converted A12 models.
 *
 * <p>Consolidates two steps that previously lived as separate Gradle tasks:
 * <ol>
 *   <li>Validation script generation via {@code BatchVkValidationCodeGeneratorJs}</li>
 *   <li>Model graph generation via {@code ModelGraphGenerator}</li>
 * </ol>
 */
public final class PostProcessingCli {

    private static final JsonMapper MAPPER = new JsonMapper();

    private PostProcessingCli() {}

    public static void main(String[] args) throws Exception {
        String modelsDir = null;
        String modelGraphOutput = null;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--models-dir":
                    modelsDir = args[++i];
                    break;
                case "--model-graph-output":
                    modelGraphOutput = args[++i];
                    break;
                default:
                    System.err.println("Unknown argument: " + args[i]);
                    System.exit(1);
            }
        }

        if (modelsDir == null || modelGraphOutput == null) {
            System.err.println("Usage: PostProcessingCli --models-dir <dir> --model-graph-output <file>");
            System.exit(1);
        }

        Path modelsPath = Path.of(modelsDir);
        generateValidationScripts(modelsPath);
        generateModelGraph(modelsPath, Path.of(modelGraphOutput));
    }

    private static void generateValidationScripts(Path modelsDir) throws Exception {
        List<Path> documentModels = new ArrayList<>();

        try (Stream<Path> files = Files.walk(modelsDir)) {
            for (Path file : files.filter(f -> f.toString().endsWith(".json")).toList()) {
                try {
                    ObjectNode root = (ObjectNode) MAPPER.readTree(file.toFile());
                    ObjectNode header = (ObjectNode) root.get("header");
                    if (header != null && "document".equals(header.get("modelType").asText())) {
                        documentModels.add(file);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        if (documentModels.isEmpty()) {
            System.out.println("No document models found — skipping validation script generation.");
            return;
        }

        System.out.println("Found " + documentModels.size() + " document model(s) for validation script generation.");

        Path tempWorkspace = Files.createTempDirectory("validation-workspace");
        try {
            for (Path doc : documentModels) {
                Files.copy(doc, tempWorkspace.resolve(doc.getFileName()));
            }

            List<String> cmd = new ArrayList<>();
            String java = System.getProperty("java.home") + File.separator + "bin" + File.separator + "java";
            cmd.add(java);
            cmd.add("-cp");
            cmd.add(System.getProperty("java.class.path"));
            cmd.add("com.mgmtp.a12.kernel.md.model.a12internal.services.codegen.cli.BatchVkValidationCodeGeneratorJs");
            cmd.add("-w");
            cmd.add(tempWorkspace.toString());

            for (Path doc : documentModels) {
                String baseName = doc.getFileName().toString().replaceAll("\\.json$", "");
                cmd.add(doc.toString());
                cmd.add(modelsDir.resolve(baseName + ".validation.js").toString());
            }

            int exitCode = new ProcessBuilder(cmd).inheritIO().start().waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("BatchVkValidationCodeGeneratorJs exited with code " + exitCode);
            }
        } finally {
            deleteRecursively(tempWorkspace);
        }
    }

    private static void generateModelGraph(Path modelsDir, Path outputFile) throws Exception {
        Path tempFlatDir = Files.createTempDirectory("modelgraph-flat");
        try {
            try (Stream<Path> files = Files.walk(modelsDir)) {
                for (Path file : files.filter(f -> f.toString().endsWith(".json")).toList()) {
                    Files.copy(file, tempFlatDir.resolve(file.getFileName()));
                }
            }

            Files.createDirectories(outputFile.getParent());

            String java = System.getProperty("java.home") + File.separator + "bin" + File.separator + "java";
            int exitCode = new ProcessBuilder(List.of(
                    java, "-cp", System.getProperty("java.class.path"),
                    "com.mgmtp.a12.dataservices.modelgraph.fs.impl.ModelGraphGenerator",
                    "--output=" + outputFile,
                    tempFlatDir + File.separator
            )).inheritIO().start().waitFor();

            if (exitCode != 0) {
                throw new RuntimeException("ModelGraphGenerator exited with code " + exitCode);
            }
        } finally {
            deleteRecursively(tempFlatDir);
        }
    }

    private static void deleteRecursively(Path dir) {
        try (Stream<Path> files = Files.walk(dir).sorted(Comparator.reverseOrder())) {
            files.forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
        } catch (IOException ignored) {
        }
    }
}
