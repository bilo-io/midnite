import{a_ as T}from"./iframe-Dbv8GeUC.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-iDDAXBqn.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DUQOmHN-.js";import"./Select-ef7c0426.esm-BtLyMKAa.js";import"./chevron-down-BojTJ9dd.js";import"./check-C676Z6fj.js";import"./project-tag-ueLXHLrb.js";import"./project-modal-Cjah15zA.js";import"./export-menu-BhyS1Mmc.js";import"./client-aQCNNeW0.js";import"./markdown-preview-MN59M1-R.js";import"./index.dom-D_wTd2ti.js";import"./file-text-UOhROh6P.js";import"./copy-4hDKluiY.js";import"./file-code-corner-BKEXtMZO.js";import"./loader-circle-P1Z8Xk-a.js";import"./api-CYrdW_Uy.js";import"./folder-open-DndOy5Hq.js";import"./folder-rh_DVxLj.js";import"./tag-color-picker-EJRb4Ma9.js";import"./sparkles-1QoBmck6.js";import"./brain-CEJJO2jL.js";import"./chevron-right-CZIU9qWD.js";import"./markdown-editor-DKoAMeP5.js";import"./pencil-BGSNorbY.js";import"./trash-2-68qyk1vq.js";import"./confirm-dialog-C4eCkV74.js";import"./templates-BzAEHnXs.js";import"./plus-DG5lmwzv.js";import"./task-row-X0PrcrDa.js";import"./blocked-badge-DhqpgW1E.js";import"./selectable-icon-DIZHIik6.js";import"./hover-expand-button-BuLyxOy8.js";import"./index-BaFJ7AjI.js";import"./data-refresh-zQX687gF.js";import"./rotate-ccw-wQfAvU_V.js";import"./play-8xIQeECd.js";import"./square-terminal-oYB9e4Pm.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DcFoJ-UT.js";import"./spinner-Dl8OQ55M.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DcVrq74G.js";import"./useQuery-DJflcKoR.js";import"./presentation-p8SRwdKn.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Tt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const xt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,xt as __namedExportsOrder,Tt as default};
