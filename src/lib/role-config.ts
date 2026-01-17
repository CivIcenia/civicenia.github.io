import { z } from "astro:content";
import { RoleDefinitionSchema, RoleConfigSchema } from "@schemas";
import RoleConfigData from "../data/role-config.yml";

// ############################################################
// Role Configuration
// ############################################################

export namespace RoleConfig {
    export const RoleDefinitionSchema_ = RoleDefinitionSchema;
    export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;

    export const Schema = RoleConfigSchema;
    export type RoleConfigData = z.infer<typeof RoleConfigSchema>;

    export function getRoleConfig(): RoleConfigData {
        const parsed = Schema.safeParse(RoleConfigData);
        if (parsed.success) {
            return parsed.data;
        }
        // Return defaults if parsing fails
        return {
            republic_roles: [],
            city_roles: []
        };
    }

    export function getRepublicRoles(): RoleDefinition[] {
        return getRoleConfig().republic_roles.sort((a, b) => a.order - b.order);
    }

    export function getCityRoles(): RoleDefinition[] {
        return getRoleConfig().city_roles.sort((a, b) => a.order - b.order);
    }

    export function getRoleById(roleId: string, isCity: boolean = false): RoleDefinition | undefined {
        const roles = isCity ? getCityRoles() : getRepublicRoles();
        return roles.find(r => r.id === roleId);
    }
}
