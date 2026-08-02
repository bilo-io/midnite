import{aZ as T}from"./iframe-DIRT-jPh.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BSvOL0l8.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BDKKvLcu.js";import"./Select-ef7c0426.esm-CenWVZPI.js";import"./chevron-down-21KOUYAq.js";import"./check-DKs1mfb8.js";import"./project-tag-WPQdSRrV.js";import"./project-modal-BBnthqQw.js";import"./export-menu-nCuog2qa.js";import"./client-B-ryNkaa.js";import"./markdown-preview-Bpyza2px.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D8mEtSQT.js";import"./copy-BE2jzBYJ.js";import"./file-code-corner-DKYLNI1N.js";import"./loader-circle-DIWpoO1-.js";import"./api-BirC5KZo.js";import"./folder-open-CTDx0b5k.js";import"./folder-CZZ5Skog.js";import"./tag-color-picker-D9kd638r.js";import"./sparkles-Bu1lIk4R.js";import"./brain-BiMPLGY6.js";import"./chevron-right-BSd-JLxl.js";import"./markdown-editor-B6ino2mE.js";import"./pencil-CEle_Tbs.js";import"./trash-2-ClPGu5d6.js";import"./confirm-dialog-C8B7Utkh.js";import"./index-BnyK6tdm.js";import"./triangle-alert-BrF9xjg9.js";import"./templates-B845kxB8.js";import"./plus-DV4YFmtQ.js";import"./task-row-evJepzoR.js";import"./blocked-badge-8N_g_Oau.js";import"./selectable-icon-D0VGhisG.js";import"./hover-expand-button-_88jihe2.js";import"./index-DVjpEYAS.js";import"./data-refresh-DVhMCSY1.js";import"./rotate-ccw-DItjLm14.js";import"./play-BJrJ6E4J.js";import"./square-terminal-T-Sno8oZ.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CeDAunbU.js";import"./spinner-Bk8jEVRT.js";import"./task-route-D70_7rUP.js";import"./use-api-data-9Woq8Tet.js";import"./useQuery-CGGfYBmA.js";import"./presentation-aAEgECwQ.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const kt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,kt as __namedExportsOrder,Dt as default};
