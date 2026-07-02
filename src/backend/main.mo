// StrataFi composition root.
// Wires the core-types domain mixin, the vendored authorization modules
// (provided by the build system), and the data-viewer MixinViews for admin
// inspection of stable state. The actor owns all stable state and delegates
// every operation to the mixins — no business logic lives here.

import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import CoreLib "lib/core-types";
import CoreTypesMixin "mixins/core-types-api";
import Migration "migration";

(with migration = Migration.run)
actor {
  // IC HTTP outcall transform callback. Must be a named public query func on
  // the actor (M0077 forbids inline shared funcs); passed by reference into
  // the core-types lib for outbound voice calls.
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Vendored authorization state (provided by build system).
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState, null);

  // StrataFi multi-tenant CRM state. The State record wraps mutable counters
  // in `var` fields so mutations propagate to the mixin via shared reference.
  let state = CoreLib.emptyState();

  // Auto-exposes admin-only __<var> viewer queries for every stable variable.
  include MixinViews();

  // Core-types domain API (tenant/user/lead/interaction/campaign/billing/
  // dashboard CRUD + bulk lead import + outbound voice call placement +
  // mock data seeding).
  include CoreTypesMixin(state, transform);
};
