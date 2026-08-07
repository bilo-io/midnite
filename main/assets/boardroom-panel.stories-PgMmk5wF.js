import{b0 as T}from"./iframe-CRiiLLXQ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Ckol0W--.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CoMZ62RS.js";import"./Select-ef7c0426.esm-DZw24tKm.js";import"./chevron-down-Ck7UTHJ6.js";import"./check-QRLuT_Sp.js";import"./project-tag-BsrSkZph.js";import"./project-modal-BrV3ovbE.js";import"./export-menu-DRhqQfC8.js";import"./client-B2eAUoM_.js";import"./markdown-preview-B0OFK6pe.js";import"./index.dom-D_wTd2ti.js";import"./copy-BM0J7Ae4.js";import"./file-code-corner-YpIViRrH.js";import"./file-text-CwLxQmeE.js";import"./loader-circle-DDU8Hgr4.js";import"./api-BotKAxU2.js";import"./folder-open-bMqpwAH0.js";import"./folder-BX6fXg4d.js";import"./tag-color-picker-74_EylI1.js";import"./sparkles-Cil3ept1.js";import"./brain-D81U7CDu.js";import"./chevron-right-CjKdrvBF.js";import"./markdown-editor-D1j38deh.js";import"./pencil-BZCqCiwV.js";import"./trash-2-D1adr0rm.js";import"./confirm-dialog-inhU6rHB.js";import"./templates-CEfLTno4.js";import"./project-template-labels-ByXeyE4V.js";import"./plus-RjEg9nFl.js";import"./task-row-D8UZ1Yuf.js";import"./blocked-badge-jZuvGdIv.js";import"./selectable-icon-DcIlIAhj.js";import"./hover-expand-button-DOGrdZ7r.js";import"./index-QxBL4L94.js";import"./data-refresh-D2RKXFTf.js";import"./rotate-ccw-DCZxTpbC.js";import"./play-BoU5VIXh.js";import"./square-terminal-CR2vboRK.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-JALfRoLt.js";import"./spinner-Bq_HpIeB.js";import"./task-route-D70_7rUP.js";import"./use-api-data-Bq9AvJnN.js";import"./useQuery-CdeUcyy9.js";import"./presentation-TS5OUdid.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
