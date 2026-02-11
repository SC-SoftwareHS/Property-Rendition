import { relations } from 'drizzle-orm';
import { firms } from './firms';
import { users } from './users';
import { clients } from './clients';
import { locations } from './locations';
import { jurisdictions } from './jurisdictions';
import { assets } from './assets';
import { assetSnapshots } from './asset-snapshots';
import { renditions } from './renditions';

export const firmsRelations = relations(firms, ({ many }) => ({
  users: many(users),
  clients: many(clients),
}));

export const usersRelations = relations(users, ({ one }) => ({
  firm: one(firms, {
    fields: [users.firmId],
    references: [firms.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  firm: one(firms, {
    fields: [clients.firmId],
    references: [firms.id],
  }),
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  client: one(clients, {
    fields: [locations.clientId],
    references: [clients.id],
  }),
  jurisdiction: one(jurisdictions, {
    fields: [locations.jurisdictionId],
    references: [jurisdictions.id],
  }),
  assets: many(assets),
  renditions: many(renditions),
}));

export const jurisdictionsRelations = relations(
  jurisdictions,
  ({ many }) => ({
    locations: many(locations),
    renditions: many(renditions),
  }),
);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  location: one(locations, {
    fields: [assets.locationId],
    references: [locations.id],
  }),
  snapshots: many(assetSnapshots),
}));

export const assetSnapshotsRelations = relations(
  assetSnapshots,
  ({ one }) => ({
    asset: one(assets, {
      fields: [assetSnapshots.assetId],
      references: [assets.id],
    }),
  }),
);

export const renditionsRelations = relations(renditions, ({ one }) => ({
  location: one(locations, {
    fields: [renditions.locationId],
    references: [locations.id],
  }),
  jurisdiction: one(jurisdictions, {
    fields: [renditions.jurisdictionId],
    references: [jurisdictions.id],
  }),
}));
