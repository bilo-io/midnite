import { z } from 'zod';

export const TeamRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type Team = z.infer<typeof TeamSchema>;

export const TeamMemberSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  role: TeamRoleSchema,
  joinedAt: z.string(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamWithMembersSchema = TeamSchema.extend({
  members: z.array(TeamMemberSchema),
});
export type TeamWithMembers = z.infer<typeof TeamWithMembersSchema>;

export const TeamInviteSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  invitedBy: z.string(),
  email: z.string().nullable(),
  token: z.string(),
  role: TeamRoleSchema,
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type TeamInvite = z.infer<typeof TeamInviteSchema>;

export const CreateTeamRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens')
    .min(2)
    .max(40),
});
export type CreateTeamRequest = z.infer<typeof CreateTeamRequestSchema>;

export const UpdateTeamRequestSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});
export type UpdateTeamRequest = z.infer<typeof UpdateTeamRequestSchema>;

export const SetMemberRoleRequestSchema = z.object({
  role: TeamRoleSchema,
});
export type SetMemberRoleRequest = z.infer<typeof SetMemberRoleRequestSchema>;

export const CreateInviteRequestSchema = z.object({
  email: z.string().email().optional(),
  role: TeamRoleSchema.default('member'),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;
