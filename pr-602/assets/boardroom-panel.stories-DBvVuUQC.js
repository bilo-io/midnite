import{a$ as T}from"./iframe-Df9-NFzZ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D-CrhMF5.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Velv4tbD.js";import"./Select-ef7c0426.esm-LOz6FoKL.js";import"./chevron-down-DrPiuqdT.js";import"./check-lyzHGyuG.js";import"./project-tag-j2ReiEyi.js";import"./project-modal-CaG7xoKG.js";import"./export-menu-CrI3FaMB.js";import"./client-CV_we8aY.js";import"./markdown-preview-Cf0LD5Cf.js";import"./index.dom-D_wTd2ti.js";import"./copy-B9-xGFq5.js";import"./file-code-corner-CYDwrkP0.js";import"./file-text-BzQxQ1iZ.js";import"./loader-circle-8yWU-yvU.js";import"./api-BSIQq3of.js";import"./folder-open-RN3AgE1t.js";import"./folder-CZrJqyaE.js";import"./tag-color-picker-BH-a6IUW.js";import"./sparkles-BXgOw8Qn.js";import"./brain-DCOM-RYp.js";import"./chevron-right-Drst9JJ9.js";import"./markdown-editor-C6Cr2qAA.js";import"./pencil-B3TTArpU.js";import"./trash-2-DDjmKNdf.js";import"./confirm-dialog-Ds4D0dW8.js";import"./templates-6Bzalm-K.js";import"./project-template-labels-CxHK9bj5.js";import"./plus-CEGIl1kf.js";import"./task-row-BHfyyDNl.js";import"./blocked-badge-Hu1vMoch.js";import"./selectable-icon-C3bAZ5zM.js";import"./hover-expand-button-CXNKikvF.js";import"./index-DBT0LLZB.js";import"./data-refresh-B7q3cUAO.js";import"./rotate-ccw-CxVdpw4B.js";import"./play-C5uKIz-E.js";import"./square-terminal-D1oCHV6G.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-BkXIuWGX.js";import"./spinner-BMvZM79r.js";import"./task-route-D70_7rUP.js";import"./use-api-data-Bt3RnKts.js";import"./useQuery--tpw96eu.js";import"./presentation-DAgrdea3.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Dt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,Dt as __namedExportsOrder,xt as default};
