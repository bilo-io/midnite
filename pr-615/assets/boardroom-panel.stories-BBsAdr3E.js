import{b0 as T}from"./iframe-CtXWtJkV.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DY1KU56y.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BC2AUHwb.js";import"./Select-ef7c0426.esm-BzTfeGHC.js";import"./chevron-down-vyy3wI3S.js";import"./check--rJN6KT7.js";import"./project-tag-B7k2IIxC.js";import"./project-modal-aa4JZc68.js";import"./export-menu-D_f3WdNE.js";import"./client-Dg4nMySy.js";import"./markdown-preview-CGUtAIJ4.js";import"./index.dom-D_wTd2ti.js";import"./copy-Df394GM0.js";import"./file-code-corner-C_Dfh9b-.js";import"./file-text-B19Y6pZz.js";import"./loader-circle-DMm6uK9_.js";import"./api-ZUN0VV_b.js";import"./folder-open-DQgBvX8f.js";import"./folder-CvQTrmry.js";import"./tag-color-picker-CZDrz1cK.js";import"./sparkles-C35RiOYD.js";import"./brain-BJ-2vUkx.js";import"./chevron-right-BDpdZcjq.js";import"./markdown-editor-DwLGNpHF.js";import"./pencil-xcVMAWk1.js";import"./trash-2-D46gcqL1.js";import"./confirm-dialog-DConvv8R.js";import"./templates-BEYky3iv.js";import"./project-template-labels-DcP-2Hyh.js";import"./plus-Bnr-w_am.js";import"./task-row-BoZounhE.js";import"./blocked-badge-BtCoaUYw.js";import"./selectable-icon-Y8v7BZXK.js";import"./hover-expand-button-D1-ze31y.js";import"./index-DOsqR3mj.js";import"./data-refresh-C2pXdEUO.js";import"./rotate-ccw-6LppdyA9.js";import"./play-CxRH3o7F.js";import"./square-terminal-BZXiHHW3.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CYotHKbK.js";import"./spinner-CzDyamNo.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DJNzHNwc.js";import"./useQuery-BD-zK7rT.js";import"./presentation-Cm2OVN2K.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
