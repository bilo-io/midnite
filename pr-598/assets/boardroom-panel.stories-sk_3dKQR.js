import{a_ as T}from"./iframe-DT5QZXTQ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BCnKmOOP.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bmt_wjVH.js";import"./Select-ef7c0426.esm-y4dwAMzX.js";import"./chevron-down-0YfKdima.js";import"./check-BdEux5vg.js";import"./project-tag-DmZ4XXLZ.js";import"./project-modal-BfvwlYpI.js";import"./export-menu-8NELiuOJ.js";import"./client-B5k92456.js";import"./markdown-preview-yARCG_tI.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C719jH1q.js";import"./copy-BHN1kH2p.js";import"./file-code-corner-BIA0GnAV.js";import"./loader-circle-B4NYgb3Z.js";import"./api-BSqEXogR.js";import"./folder-open-BjFbGXOU.js";import"./folder-hSbMXSEE.js";import"./tag-color-picker-DDh36-hl.js";import"./sparkles-B8WBhQEH.js";import"./brain-DbnISs5w.js";import"./chevron-right-BPZFIBBj.js";import"./markdown-editor-DSMeD9qd.js";import"./pencil-BmDLe8NE.js";import"./trash-2-Bg75s_2N.js";import"./confirm-dialog-C8kBpWFn.js";import"./templates-BNS19VfM.js";import"./project-template-labels-B65cKjAd.js";import"./plus-CPir_CxS.js";import"./task-row-D2mVILkk.js";import"./blocked-badge-DvS6m2rT.js";import"./selectable-icon-BnVmc5BK.js";import"./hover-expand-button-CNu2ET2q.js";import"./index-C65WNkkZ.js";import"./data-refresh-Cl4WClmM.js";import"./rotate-ccw-TXsguaVj.js";import"./play-zEBxG9uX.js";import"./square-terminal-C0PAcmh9.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CzS0FTsa.js";import"./spinner-CDXj0nRE.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DOWSZm6l.js";import"./useQuery-BE8hCPdR.js";import"./presentation-CgvTbPBZ.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
