package fr.openent.mediacentre.controller;

import fr.openent.mediacentre.service.FeaturedResourcesService;
import fr.openent.mediacentre.service.impl.DefaultFeaturedResourcesService;
import fr.openent.mediacentre.source.Source;
import fr.wseduc.bus.BusAddress;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.user.UserUtils;

import java.util.List;

import static fr.openent.mediacentre.core.constants.Field.*;

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
}
