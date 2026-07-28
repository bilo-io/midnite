import{aX as T}from"./iframe-sIaWvBUf.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BmDeeli4.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DtcO9DZP.js";import"./Select-ef7c0426.esm-ey-fWCK8.js";import"./chevron-down-pnTWsFL2.js";import"./check-C4HHqLiG.js";import"./project-tag-DwT8DVek.js";import"./project-modal-BNzF4sRj.js";import"./export-menu-BQS0VZYU.js";import"./client-DTkblejR.js";import"./markdown-preview-BaACzGOG.js";import"./index.dom-D_wTd2ti.js";import"./file-text-KrcRGc8W.js";import"./copy-8sb4UcgL.js";import"./file-code-corner-M6NnMazK.js";import"./loader-circle-Do6JDOtQ.js";import"./api-pE96PHEe.js";import"./folder-open-DTjI0sRR.js";import"./folder-DcVC4abj.js";import"./tag-color-picker-M7D90cfQ.js";import"./sparkles-CpoKQ43G.js";import"./brain-CK-VcWe2.js";import"./chevron-right-Ct8ZFpi5.js";import"./markdown-editor-soHuJVD7.js";import"./pencil-CTHGRobv.js";import"./trash-2-Crwc-fJq.js";import"./confirm-dialog-CKlBNmCA.js";import"./index-B8YeLkcR.js";import"./triangle-alert-DnKvQT7z.js";import"./templates-Bjnqi72I.js";import"./plus-nv-eEQ-8.js";import"./task-row-d8SRtAnc.js";import"./i18n-labels-C2jUwki0.js";import"./selectable-icon-DtHdz4F_.js";import"./task-columns-BUR8DOSo.js";import"./spinner-K-Qtt3aG.js";import"./task-route-D70_7rUP.js";import"./data-refresh-D2BPRCcK.js";import"./use-api-data-CUEhTyAG.js";import"./useQuery-CZUyU1bS.js";import"./presentation-Diy28utW.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,ft={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=o.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Et=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Et as __namedExportsOrder,ft as default};
