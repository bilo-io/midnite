import{aX as T}from"./iframe-BlOxJO6F.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DrXpcm-h.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DXmRVUYO.js";import"./Select-ef7c0426.esm-BaRWKZ8E.js";import"./chevron-down-20bha-r_.js";import"./check-irjg0bGT.js";import"./project-tag-BgnnNA93.js";import"./project-modal-CFZj7UkK.js";import"./export-menu-lCAruYUl.js";import"./client-DxvNJe05.js";import"./markdown-preview--wW9z_a-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BQ0IjrdY.js";import"./copy-D9LR3uqz.js";import"./file-code-corner-C3PJurTr.js";import"./loader-circle-54mp3fFZ.js";import"./api-DAduwjXk.js";import"./folder-open-CezmuM-g.js";import"./folder-CLDfl1Vj.js";import"./tag-color-picker-CAbHCm_f.js";import"./sparkles-U2ZUCs_Z.js";import"./brain-ZbC2sIrN.js";import"./chevron-right-CD-qPZTc.js";import"./markdown-editor-HxBAWRCA.js";import"./pencil-C7FCSRci.js";import"./trash-2-rSSq1ir7.js";import"./confirm-dialog-B0eDajQi.js";import"./index-BaWyXp7d.js";import"./triangle-alert-B1jl38Ri.js";import"./templates-B6M1OYb3.js";import"./plus-B4q8dM4m.js";import"./task-row-DIGcAK7A.js";import"./blocked-badge-Bh2_EEYM.js";import"./selectable-icon-BOYur1Sw.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CMgFeL_x.js";import"./arrow-left-Mk3Sqj4m.js";import"./spinner-DeuoiEr2.js";import"./task-route-D70_7rUP.js";import"./data-refresh-na1Qkl3r.js";import"./use-api-data-B-BP48Xa.js";import"./useQuery-D3Fjx84b.js";import"./presentation-CSdpROHA.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
