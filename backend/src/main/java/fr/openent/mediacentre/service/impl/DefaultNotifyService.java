package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.service.NotifyService;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import org.entcore.common.http.request.JsonHttpServerRequest;
import org.entcore.common.notification.TimelineHelper;

import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import static fr.wseduc.webutils.http.Renders.unauthorized;

public class DefaultNotifyService implements NotifyService {
    private static final Logger log = LoggerFactory.getLogger(DefaultNotifyService.class);

    private final TimelineHelper timelineHelper;
    private final EventBus eb;

    public DefaultNotifyService(TimelineHelper timelineHelper, EventBus eb){
        this.timelineHelper = timelineHelper;
        this.eb = eb;
    }

    @Override
    public void notifyNewPinnedResource(HttpServerRequest request, JsonArray users, Boolean isParent) {
        UserUtils.getUserInfos(eb, request, user -> {
            if (user == null) {
                String message = "[Mediacentre@DefaultNotifyService:notifyNewPinnedResource] User not found in session.";
                log.error(message);
                unauthorized(request, message);
                return;
            }
            if (Boolean.TRUE.equals(isParent)) {
                user = new UserInfos();
            }

            notifyNewResourceMain(request, users, user);
        });
    }

    private void notifyNewResourceMain(HttpServerRequest request, JsonArray users, UserInfos user) {
        String resourceUri = "/mediacentre";

        JsonObject params = new JsonObject()
                .put(Field.PARAM_URI, "/userbook/annuaire#" + user.getUserId())
                .put(Field.USERNAME, user.getUsername())
                .put(Field.PARAM_PUSH_NOTIF, new JsonObject().put(Field.TITLE, "push.notif.mediacentre.title").put(Field.BODY, "push.notif.mediacentre.newResource"))
                .put(Field.PARAM_RESOURCE_URI, resourceUri);

        timelineHelper.notifyTimeline(request, "mediacentre.pinned_resource_notification", user, users.getList(), params);
    }
}
