import{b0 as T}from"./iframe-BUTs4p2n.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Bh55L6Uj.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DN7i53wW.js";import"./Select-ef7c0426.esm-Dn8NC-WJ.js";import"./chevron-down-DpHboeLV.js";import"./check-D-2Oq7Gr.js";import"./project-tag-BWrmyR63.js";import"./project-modal-BuhYh6V3.js";import"./export-menu-Dv3E_h-9.js";import"./client-nuVppoIi.js";import"./markdown-preview-_EesXvmw.js";import"./index.dom-D_wTd2ti.js";import"./copy-BdVj-bac.js";import"./file-code-corner-Cd4GwUdI.js";import"./file-text-CvnqNm_I.js";import"./loader-circle-IfP8nERF.js";import"./api-X8diawYb.js";import"./folder-open-BJFbj_2s.js";import"./folder-BXUI2i0b.js";import"./tag-color-picker-34ZqEFxX.js";import"./sparkles-D4cZgFKH.js";import"./brain-CjJT4Ku4.js";import"./chevron-right-DiMPu901.js";import"./markdown-editor-D4zP-D7o.js";import"./pencil-DtvMimfd.js";import"./trash-2-1omgziaQ.js";import"./confirm-dialog-B485z4O3.js";import"./templates-CC_QsQtn.js";import"./project-template-labels-CktM0gpf.js";import"./plus-DeLnmSeE.js";import"./task-row-CHWgXLLI.js";import"./blocked-badge-C78h_Z5x.js";import"./selectable-icon-BF__eBNR.js";import"./hover-expand-button-DfLyUoQF.js";import"./index-DVjzTIEI.js";import"./data-refresh-DvklCX-d.js";import"./rotate-ccw-DV7u0bmE.js";import"./play-Cjvy8J-N.js";import"./square-terminal-BELudxrR.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-LeaSkaf5.js";import"./spinner-DehcyzRx.js";import"./task-route-D70_7rUP.js";import"./use-api-data-CAJoutge.js";import"./useQuery-cR3K73A4.js";import"./presentation-DN0LxlDH.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
