import{a_ as T}from"./iframe-BYeijVfv.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-8ETSrKs8.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bn_Hiynk.js";import"./Select-ef7c0426.esm-qT_YlFzZ.js";import"./chevron-down-IHem03gS.js";import"./check-Q4Et48A8.js";import"./project-tag-6Ovd2kMN.js";import"./project-modal-Ca6QJkKx.js";import"./export-menu-CuZKm41C.js";import"./client-BSCxnvfz.js";import"./markdown-preview-YPbhrbo3.js";import"./index.dom-D_wTd2ti.js";import"./copy-C6qTj7JN.js";import"./file-code-corner-DY5yQr-s.js";import"./file-text-CWQmBXHd.js";import"./loader-circle-qzvxN3wF.js";import"./api-BHWOT6-6.js";import"./folder-open-DFHbzZUi.js";import"./folder-KTSs-FKM.js";import"./tag-color-picker-DHh0y3jh.js";import"./sparkles-CzTTui6u.js";import"./brain-CIYmRC6T.js";import"./chevron-right-CKgHqwZm.js";import"./markdown-editor-BV9mMT8e.js";import"./pencil-Cs7hSwwG.js";import"./trash-2-DNYavOyZ.js";import"./confirm-dialog-DGvG4MfJ.js";import"./templates-DWV6dje7.js";import"./project-template-labels-9ktGc_2T.js";import"./plus-Cpi8eHJo.js";import"./task-row-DaSHDvBL.js";import"./blocked-badge-nUiVVa8k.js";import"./selectable-icon-DZ8nopPV.js";import"./hover-expand-button-Diaiosme.js";import"./index-CTc3rxPE.js";import"./data-refresh-SCDyQBuk.js";import"./rotate-ccw-D1UvSFED.js";import"./play-DicHg6az.js";import"./square-terminal-D9JpBfoC.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-ySKq8H38.js";import"./spinner-BkkTz3TP.js";import"./task-route-D70_7rUP.js";import"./use-api-data-CKtA78-N.js";import"./useQuery-_ag8Lcrk.js";import"./presentation-BAPr5uap.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
