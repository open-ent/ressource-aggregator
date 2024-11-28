package fr.openent.mediacentre.model;

import static fr.openent.mediacentre.core.constants.Field.*;
import fr.openent.mediacentre.helper.IModelHelper;
import io.vertx.core.json.JsonObject;

public class FeaturedResource extends Resource implements IModel<FeaturedResource>{

    private String resourceId;
    private String description;
    private String source;
    private String module;

    public FeaturedResource() {
        super();
    }

    public FeaturedResource(JsonObject resource) {
        this.resourceId = resource.getString(RESOURCE_ID, null);
        this.description = resource.getString(DESCRIPTION, null);
        this.source = resource.getString(SOURCE, null);
        this.module = resource.getString(MODULE, null);
    }

    // Getters et setters
    public String getResourceId() {
        return resourceId;
    }

    public FeaturedResource setResourceId(String resourceId) {
        this.resourceId = resourceId;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public FeaturedResource setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getSource() {
        return source;
    }

    public FeaturedResource setSource(String source) {
        this.source = source;
        return this;
    }

    public String getModule() {
        return module;
    }

    public FeaturedResource setModule(String module) {
        this.module = module;
        return this;
    }
}
