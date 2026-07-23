import{aU as T}from"./iframe-CT9nlirp.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-y26Z3dxe.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Dh__z4WA.js";import"./Select-ef7c0426.esm-DdNrbGgH.js";import"./chevron-down-CcVBxKzU.js";import"./check-BqUvg92y.js";import"./project-tag-C9FWHHsI.js";import"./project-modal-BSvMqFi0.js";import"./export-menu-Kn5XzE6X.js";import"./client-Df25yoe9.js";import"./markdown-preview-D7Pke061.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D9n63LvO.js";import"./copy-CC5KS9CF.js";import"./file-code-corner-1Dw72tJ6.js";import"./loader-circle-CUGq7k_X.js";import"./api-De1o9I3P.js";import"./folder-open-CodFKejP.js";import"./folder-CNIoHXX5.js";import"./tag-color-picker-e5_f1sAM.js";import"./sparkles-CZLNuaN1.js";import"./brain-zoAyu2Ww.js";import"./chevron-right-uNFOUfMd.js";import"./markdown-editor-DRjpJ6A8.js";import"./pencil-BHo0mbFg.js";import"./trash-2-CFZB-Hi8.js";import"./confirm-dialog-jcnvkRn4.js";import"./index-Ba2Sy5VO.js";import"./triangle-alert-CfT07Xkf.js";import"./templates-B6M1OYb3.js";import"./plus-7AdZQGIf.js";import"./task-row-4f8YvTad.js";import"./i18n-labels-_PHwNhkX.js";import"./selectable-icon-CGUJ-RG5.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-B9Xx0te_.js";import"./arrow-left-DkvoA8Gy.js";import"./spinner-BbqjqUQ7.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CDoE82iv.js";import"./use-api-data-zpnG2SLp.js";import"./useQuery-DTsASuwM.js";import"./presentation-CENp9oOr.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
