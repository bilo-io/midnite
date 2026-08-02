import{a_ as T}from"./iframe-CrpS2k1s.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Bmzm7ZlN.js";import"./preload-helper-Dp1pzeXC.js";import"./index-9RmbYso9.js";import"./Select-ef7c0426.esm-Ci1Qivw2.js";import"./chevron-down-tHYva2HZ.js";import"./check-BC2k6RDy.js";import"./project-tag-ZmJyz01t.js";import"./project-modal-Cv3U3k4o.js";import"./export-menu-CPpvjthf.js";import"./client-CT2jyXG6.js";import"./markdown-preview-C5IfC_aC.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BasqZkf7.js";import"./copy-t8mbqyvs.js";import"./file-code-corner-DkR3Czam.js";import"./loader-circle-UqYVoLkt.js";import"./api-DrvOg9qT.js";import"./folder-open-CbpXRs_p.js";import"./folder-DcUZUsXt.js";import"./tag-color-picker-Dvn-_aD6.js";import"./sparkles-B-bg1Pr6.js";import"./brain-83PpINFq.js";import"./chevron-right-j4Wh4g95.js";import"./markdown-editor-DDOgvDgu.js";import"./pencil-C3mT-Rbw.js";import"./trash-2-G3lxrQrU.js";import"./confirm-dialog-Cft-Q3S8.js";import"./index-DvODZydW.js";import"./templates-BwEQLIE_.js";import"./plus-Drpe1bNe.js";import"./task-row-DaeOAXss.js";import"./blocked-badge-D_4c3ZYL.js";import"./selectable-icon-Ci7kBUeP.js";import"./hover-expand-button-r6sAcaYg.js";import"./index-Dagoxqmx.js";import"./data-refresh-0CMALxS6.js";import"./rotate-ccw--i-jHrdv.js";import"./play-Bnj91n12.js";import"./square-terminal-C9N42ANy.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DK67PLhq.js";import"./spinner-fCfiHizn.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DU1QkfnB.js";import"./useQuery-lmT7zu4T.js";import"./presentation-DLBdauOa.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
