import{aX as T}from"./iframe-mQAVYY6e.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D8157abV.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DsJsThuq.js";import"./Select-ef7c0426.esm-B08OwgF5.js";import"./chevron-down-gnSZHF1I.js";import"./check-Cv313tEk.js";import"./project-tag-b6B7Zfpl.js";import"./project-modal-DzI0oG0z.js";import"./export-menu-DsdWdPzP.js";import"./client-BcT9JcbT.js";import"./markdown-preview-BQrfGOdz.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DmYTIMAA.js";import"./copy-BJrUu9Ri.js";import"./file-code-corner-BOGSlydk.js";import"./loader-circle-DaGDuxZd.js";import"./api-CYD2ZLME.js";import"./folder-open-C-6AfWA1.js";import"./folder-BBjEUr51.js";import"./tag-color-picker-B325URiN.js";import"./sparkles-xo6XKmq9.js";import"./brain-v8OgC7h5.js";import"./chevron-right-8I76idX_.js";import"./markdown-editor-pV8emqV_.js";import"./pencil-Bi43fb34.js";import"./trash-2-DmHV7nsK.js";import"./confirm-dialog-C0IVS_i6.js";import"./index-lSV0Jy08.js";import"./triangle-alert-1MKz4Tp9.js";import"./templates-BFrOoukb.js";import"./plus-BfXrHvTs.js";import"./task-row-DEcK9Haz.js";import"./i18n-labels-0N__UToG.js";import"./selectable-icon-Bn4XnvBR.js";import"./hover-expand-button-DJQuJkNT.js";import"./index-B0mybRlo.js";import"./data-refresh-D9I9ZC5-.js";import"./rotate-ccw-MawB1HC9.js";import"./play-BYMLiG00.js";import"./square-terminal-BFV4jOfl.js";import"./task-columns-BUR8DOSo.js";import"./spinner-voarFOog.js";import"./task-route-D70_7rUP.js";import"./use-api-data-VBGSJ4dv.js";import"./useQuery-BcHPRFqt.js";import"./presentation-DR8xvFsf.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
