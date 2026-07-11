package com.mgmtp.a12.relationshipengine.showcase.converters;

import com.mgmtp.a12.dataservices.wcf.WorkspaceConverter;
import com.mgmtp.a12.dataservices.wcf.annotations.WcfConverter;
import com.mgmtp.a12.dataservices.wcf.domain.ModelTuple;
import com.mgmtp.a12.dataservices.wcf.domain.Workspace;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@WcfConverter(order = 9000, name = "addAnonymousRoles", description = "Inject roles:anonymous on all runtime models for showcase anonymous auth")
public class AddAnonymousRolesConverter implements WorkspaceConverter {

    private static final String ROLES = "roles";
    private static final String ANONYMOUS = "anonymous";
    private final JsonMapper mapper = new JsonMapper();

    @Override
    public Workspace convert(Workspace workspace) {
        for (ModelTuple tuple : workspace.getModels().values()) {
            ObjectNode root = (ObjectNode) mapper.readTree(tuple.getContent());
            ObjectNode header = (ObjectNode) root.get("header");
            if (header == null) {
                continue;
            }
            ArrayNode annotations = header.has("annotations")
                    ? (ArrayNode) header.get("annotations")
                    : header.putArray("annotations");
            boolean hasRoles = false;
            for (JsonNode node : annotations) {
                if (ROLES.equals(node.path("name").asText())) {
                    hasRoles = true;
                    break;
                }
            }
            if (!hasRoles) {
                annotations.addObject().put("name", ROLES).put("value", ANONYMOUS);
            }
            tuple.setContent(mapper.writeValueAsString(root));
        }
        return workspace;
    }
}
