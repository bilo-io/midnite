import{aU as T}from"./iframe-C8Cqg7xG.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BWT7d9rp.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C4Gzk4TR.js";import"./Select-ef7c0426.esm-DQsFRFld.js";import"./chevron-down-C3Uv438n.js";import"./check-B96r-t8c.js";import"./project-tag-Clez1gVO.js";import"./project-modal-CCqJS0Dh.js";import"./export-menu-BozjC9QN.js";import"./client-4YFrDRR9.js";import"./markdown-preview-CA1jZYbS.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BjwNU6hr.js";import"./copy-D5MzTKeE.js";import"./file-code-corner-C-blhZK8.js";import"./loader-circle-DHT8cLTy.js";import"./api-g36KViNl.js";import"./folder-open-DGmw7wxU.js";import"./folder-BshHcN4t.js";import"./tag-color-picker-DVczllnt.js";import"./sparkles-C12zDR_0.js";import"./brain-D-NwX-SZ.js";import"./chevron-right-CrY9sYvg.js";import"./markdown-editor-DrFQQT65.js";import"./pencil-DiYZkuS4.js";import"./trash-2-BI7bSkhP.js";import"./confirm-dialog-Bky4B5Fi.js";import"./index-DcZQg3D3.js";import"./triangle-alert-CzNv2Hcz.js";import"./templates-B6M1OYb3.js";import"./plus-CqTZSoco.js";import"./task-row-jfscyZwx.js";import"./i18n-labels-Ij15oQH_.js";import"./selectable-icon-KbQ91QKK.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-d-wQHsvC.js";import"./arrow-left-Bgnipv3O.js";import"./spinner-Cu2hGdZa.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CFU7kvx8.js";import"./use-api-data-B3zZ3toC.js";import"./useQuery-DYG6enJ_.js";import"./presentation-DkfzQMnd.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
