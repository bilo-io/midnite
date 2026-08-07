import{a$ as T}from"./iframe-DA-MmuZw.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CR2Vji-W.js";import"./preload-helper-Dp1pzeXC.js";import"./index-tYTLESo8.js";import"./Select-ef7c0426.esm-BVAl8g99.js";import"./chevron-down-BOx3_HW8.js";import"./check-DkS9Xb5l.js";import"./project-tag-6f9PbsZs.js";import"./project-modal-GgQU1bCy.js";import"./export-menu-CsfijcnX.js";import"./client-CGIvN_mh.js";import"./markdown-preview-MhW89Uaq.js";import"./index.dom-D_wTd2ti.js";import"./copy-CG7jbJzt.js";import"./file-code-corner-PksY5g-K.js";import"./file-text-C8WtTLjo.js";import"./loader-circle-DzzZ9Inu.js";import"./api-CbRpmCQt.js";import"./folder-open-Cz-x59Jk.js";import"./folder-D6R444ai.js";import"./tag-color-picker-DjcFxtks.js";import"./sparkles-ABW0C3Hx.js";import"./brain-kshfOTAZ.js";import"./chevron-right-BEkAz4FU.js";import"./markdown-editor-RF3tNKqH.js";import"./pencil-tytP-5Rw.js";import"./trash-2-BmsQ3SCX.js";import"./confirm-dialog-Cc7YlOSZ.js";import"./templates-DHKF3B4w.js";import"./project-template-labels-Bw0GftB2.js";import"./plus-BOF2GYbE.js";import"./task-row-BgCOjIdG.js";import"./blocked-badge-rzUZFTft.js";import"./selectable-icon-CT-psJQT.js";import"./hover-expand-button-0GEzJP0Z.js";import"./index-CPkh6UQJ.js";import"./data-refresh-D7HNuLbI.js";import"./rotate-ccw-BtUxzF9w.js";import"./play-ZHYVxNTk.js";import"./square-terminal-ByXmHm-T.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-ssqVjSYO.js";import"./spinner-C4HVZ8vT.js";import"./task-route-D70_7rUP.js";import"./use-api-data-eUgmeUzD.js";import"./useQuery-s8tFbTx4.js";import"./presentation-DSi5JBTd.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
