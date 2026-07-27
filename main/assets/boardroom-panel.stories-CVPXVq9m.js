import{aW as T}from"./iframe-B8GlyQyo.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CJAXF2-d.js";import"./preload-helper-Dp1pzeXC.js";import"./index-21uLl9hO.js";import"./Select-ef7c0426.esm-_CQuIEfI.js";import"./chevron-down-CMLLOmjE.js";import"./check-DSiKQFhM.js";import"./project-tag-jKI4S8id.js";import"./project-modal-DHoG6ZXI.js";import"./export-menu-DykScqDj.js";import"./client-C1mXKFZN.js";import"./markdown-preview-BN1g4ncS.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C2xSVxN-.js";import"./copy-DymYLYgg.js";import"./file-code-corner-Hn1igb-8.js";import"./loader-circle-kxcIDgE3.js";import"./api-BS5GtZK8.js";import"./folder-open-Bo2WMx7h.js";import"./folder-BzIsDf8H.js";import"./tag-color-picker-Cd5igcPO.js";import"./sparkles-5Cv8neot.js";import"./brain-kELXU328.js";import"./chevron-right-D9qI70dy.js";import"./markdown-editor-ee3q8lzG.js";import"./pencil-GqpS8fnA.js";import"./trash-2-Dc3s7edV.js";import"./confirm-dialog-nVghYr6Q.js";import"./index-C-R3pZEr.js";import"./triangle-alert-BrcEx31x.js";import"./templates-B6M1OYb3.js";import"./plus-DfbMdhg6.js";import"./task-row-DfsuprEv.js";import"./i18n-labels-C6PxAI7J.js";import"./selectable-icon-CN_cJr4q.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C7uSv0NA.js";import"./arrow-left-DmZKT4cx.js";import"./spinner-opoN4saj.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BmIZ3k7j.js";import"./use-api-data-DrlBfUTW.js";import"./useQuery-Bs0qwHIF.js";import"./presentation--Vo8Ykfk.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
