package fr.openent.mediacentre.controller;

import fr.openent.mediacentre.Mediacentre;
import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.helper.IModelHelper;
import fr.openent.mediacentre.model.FeaturedResource;
import fr.openent.mediacentre.security.PinRight;
import fr.openent.mediacentre.service.FeaturedResourcesService;
import fr.openent.mediacentre.service.impl.DefaultFeaturedResourcesService;
import fr.openent.mediacentre.source.Source;
import fr.wseduc.bus.BusAddress;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Delete;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.RequestUtils;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.SuperAdminFilter;
import org.entcore.common.user.UserUtils;

import java.util.List;
import java.util.stream.Collectors;

import static fr.openent.mediacentre.core.constants.Field.*;
import static org.entcore.common.http.response.DefaultResponseHandler.defaultResponseHandler;

public class FeaturedResourcesController extends ControllerHelper {
    private final EventBus eb;
    private final List<Source> sources;
    private final FeaturedResourcesService featuredResourcesService;

    public FeaturedResourcesController(EventBus eb, List<Source> sources) {
        super();
        this.eb = eb;
        this.sources = sources;
        this.featuredResourcesService = new DefaultFeaturedResourcesService(sources);
    }

    @BusAddress(MEDIACENTRE_FEATURED_ADDRESS)
    public void getFeaturedResources(Message<JsonObject> message) {
        JsonObject body = message.body();
        String userId = body.getString(USER, null);
        String moduleName = body.getString(MODULE, null);
        if (userId == null || moduleName == null) {
            message.fail(400, "ERROR : User or module name is missing");
            return;
        }
        UserUtils.getUserInfos(eb, userId, user -> {
            featuredResourcesService.getFeaturedResources(user, moduleName)
                    .onSuccess(resources -> {
                        message.reply(new JsonObject().put(RESOURCES, resources));
                    })
                    .onFailure(e -> {
                        log.error("[Mediacentre@FeaturedResourcesController::getFeaturedResources] Failed to get featured resources: " + e.getMessage());
                        message.fail(500, e.getMessage());
                    });
            });
    }

    @Get("/featured")
    @ApiDoc("Get all featured resource")
    @ResourceFilter(SuperAdminFilter.class)
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    public void get(HttpServerRequest request) {
        featuredResourcesService.getFeaturedResourcesFromMongo("")
                .onSuccess(result -> {
                    JsonArray resources = IModelHelper.toJsonArray(result);
                    Renders.renderJson(request, resources);
                })
                .onFailure(error -> {
                    log.error("[Mediacentre@FeaturedResourcesController::get] Failed to get all resources: " + error.getMessage());
                    Renders.renderError(request);
                });
    }

    @Post("/featured")
    @ApiDoc("Create a featured resources")
    @ResourceFilter(SuperAdminFilter.class)
    public void create(HttpServerRequest request) {
        RequestUtils.bodyToJsonArray(request, jsonResources -> {
            try {
                List<FeaturedResource> resources = IModelHelper.toList(jsonResources, FeaturedResource.class);

                featuredResourcesService.addFeaturedResource(resources)
                        .onSuccess(response -> Renders.created(request))
                        .onFailure(e -> {
                            log.error("[Mediacentre@FeaturedResourcesController::create] Failed to create featured resources: " + e.getMessage());
                            Renders.renderError(request);
                        });
            } catch (Exception e) {
                log.error("[Mediacentre@FeaturedResourcesController::create] Failed to parse resources: " + e.getMessage());
                Renders.renderError(request);
            }
        });
    }

    @Delete("/featured")
    @ApiDoc("Delete a featured resource")
    @ResourceFilter(SuperAdminFilter.class)
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    public void delete(HttpServerRequest request) {
        String idRessource = request.getParam(Field.ID_RESSOURCE);
        featuredResourcesService.deleteFeaturedResource(idRessource)
                .onSuccess(result -> Renders.ok(request))
                .onFailure(error -> {
                    log.error("[Mediacentre@FeaturedResourcesController::delete] Failed to delete resource: " + error.getMessage());
                    Renders.renderError(request);
                });
    }
}
