import{a$ as T}from"./iframe-vNFTz3Ts.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D4eg0PeV.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BGzBdSBo.js";import"./Select-ef7c0426.esm-C-1ti25q.js";import"./chevron-down-l40ewNnw.js";import"./check-ssWnZQZq.js";import"./project-tag-BA3umkeD.js";import"./project-modal-DFC4izNW.js";import"./export-menu-HH54aPb6.js";import"./client-Z9pmxE4J.js";import"./markdown-preview-yFN4uTpF.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BdjZnLJX.js";import"./copy-BtjaetB-.js";import"./file-code-corner-BE0Me1j9.js";import"./loader-circle-CSGeX8eS.js";import"./api-DHLG7IHV.js";import"./folder-open-DaMT-Nxu.js";import"./folder-BdCPmglS.js";import"./tag-color-picker-C7odc8R9.js";import"./sparkles-C7kk7rLh.js";import"./brain-cLNyRbvW.js";import"./chevron-right-CSjajS4J.js";import"./markdown-editor-SUXAduKI.js";import"./pencil-CGbWz8OE.js";import"./trash-2-JmBnsNS1.js";import"./confirm-dialog-DqKom3Jq.js";import"./index-CnAnYl_g.js";import"./triangle-alert-B76Hgw5C.js";import"./templates-CYfMbSGV.js";import"./plus-CKygJzCX.js";import"./task-row-GCHkc_eu.js";import"./i18n-labels-DT1lWD5c.js";import"./selectable-icon-DzjWK2hx.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BZPa-br0.js";import"./arrow-left-D8vYkSwT.js";import"./spinner-kWwJXGSU.js";import"./task-route-D70_7rUP.js";import"./data-refresh-JZJD2qDA.js";import"./use-api-data-BM9hyPor.js";import"./useQuery-j5aZm_sH.js";import"./presentation-BTBDUfYq.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Bt as __namedExportsOrder,wt as default};
