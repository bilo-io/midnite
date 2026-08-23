// The GraphQL documents Projects v2 needs, kept apart from the service so the service
// reads as logic and these read as the API contract they are (Phase 84 Theme E).
//
// Hand-written, no codegen — five documents don't justify a build step, and the response
// shapes below are the whole surface we depend on.

/** `rateLimit` on every query, so the client can surface budget without a second call. */
const RATE_LIMIT = 'rateLimit { remaining resetAt }';

/**
 * Boards the viewer can see: their own, plus every org they're a member of.
 *
 * `read:org` is what makes the org half work; without it this returns the personal
 * boards only rather than failing, which is why the UI shows the owner login per board.
 */
export const VIEWER_PROJECTS_QUERY = `
  query ViewerProjects($first: Int!) {
    ${RATE_LIMIT}
    viewer {
      login
      projectsV2(first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes { id number title url closed }
      }
      organizations(first: 20) {
        nodes {
          login
          projectsV2(first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
            nodes { id number title url closed }
          }
        }
      }
    }
  }
`;

/**
 * A board's single-select fields and their options.
 *
 * Only `ProjectV2SingleSelectField` is asked for: it's the only field type a midnite
 * status can map onto, and offering text or date fields would be a way to configure
 * something that can never work.
 */
export const PROJECT_FIELDS_QUERY = `
  query ProjectFields($projectId: ID!, $first: Int!) {
    ${RATE_LIMIT}
    node(id: $projectId) {
      ... on ProjectV2 {
        id
        title
        url
        fields(first: $first) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options { id name }
            }
          }
        }
      }
    }
  }
`;

/** A board's identity, for link-time denormalisation onto the row. */
export const PROJECT_SUMMARY_QUERY = `
  query ProjectSummary($projectId: ID!) {
    ${RATE_LIMIT}
    node(id: $projectId) {
      ... on ProjectV2 { id number title url closed }
    }
  }
`;

/** Create a draft item on the board from the task, and hand back its node id. */
export const ADD_DRAFT_ITEM_MUTATION = `
  mutation AddDraftItem($projectId: ID!, $title: String!, $body: String!) {
    ${RATE_LIMIT}
    addProjectV2DraftIssue(input: { projectId: $projectId, title: $title, body: $body }) {
      projectItem { id }
    }
  }
`;

/**
 * One item's current single-select value — the item's **real column on GitHub**, which is
 * what the card shows rather than whatever midnite last pushed.
 */
export const ITEM_STATUS_QUERY = `
  query ItemStatus($itemId: ID!, $first: Int!) {
    ${RATE_LIMIT}
    node(id: $itemId) {
      ... on ProjectV2Item {
        id
        project { id title url }
        fieldValues(first: $first) {
          nodes {
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
              optionId
              field { ... on ProjectV2SingleSelectField { id name } }
            }
          }
        }
        content {
          ... on DraftIssue { title }
          ... on Issue { url title }
          ... on PullRequest { url title }
        }
      }
    }
  }
`;

// --- Response shapes (only the fields the documents above actually select) ---

export type ProjectNode = {
  id: string;
  number: number;
  title: string;
  url: string;
  closed: boolean;
};

export type ViewerProjectsResponse = {
  viewer: {
    login: string;
    projectsV2: { nodes: (ProjectNode | null)[] | null } | null;
    organizations: {
      nodes: ({ login: string; projectsV2: { nodes: (ProjectNode | null)[] | null } | null } | null)[] | null;
    } | null;
  } | null;
};

export type ProjectFieldsResponse = {
  node:
    | (Partial<ProjectNode> & {
        fields: {
          nodes: ({ id: string; name: string; options: { id: string; name: string }[] } | null)[] | null;
        } | null;
      })
    | null;
};

export type ProjectSummaryResponse = { node: ProjectNode | null };

export type AddDraftItemResponse = {
  addProjectV2DraftIssue: { projectItem: { id: string } | null } | null;
};

export type ItemStatusResponse = {
  node:
    | {
        id: string;
        project: { id: string; title: string; url: string } | null;
        fieldValues: {
          nodes:
            | ({ name?: string; optionId?: string; field?: { id?: string; name?: string } } | null)[]
            | null;
        } | null;
        content: { url?: string; title?: string } | null;
      }
    | null;
};
