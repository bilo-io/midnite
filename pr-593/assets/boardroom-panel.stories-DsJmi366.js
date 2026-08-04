import{a_ as T}from"./iframe-BBmKlLEO.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BNkZ1tRU.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BgDimCL8.js";import"./Select-ef7c0426.esm-_sTfizVO.js";import"./chevron-down-9r-cTwDn.js";import"./check-YqHLp72i.js";import"./project-tag-Bj5fuNo3.js";import"./project-modal-CtwlnsJk.js";import"./export-menu-C2lpT6Mg.js";import"./client-XznYFyBh.js";import"./markdown-preview-fy9XT2I-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C8DHBU33.js";import"./copy-BhZnFjOm.js";import"./file-code-corner-Vl1FhLSB.js";import"./loader-circle-CrFfL-2O.js";import"./api-CC0BxdhP.js";import"./folder-open-DFdpGOYx.js";import"./folder-CrtMevi1.js";import"./tag-color-picker-D85iJ1LU.js";import"./sparkles-DoWynW96.js";import"./brain-B4fYtoaw.js";import"./chevron-right-8bQHwBTl.js";import"./markdown-editor-6ElOv-SF.js";import"./pencil-BjduyB8e.js";import"./trash-2-CVcTtj2P.js";import"./confirm-dialog-DW4jqhE8.js";import"./index-DKKrZqdm.js";import"./templates-D0A-UAD7.js";import"./plus-BawQkooJ.js";import"./task-row-CQ-ZWfS-.js";import"./blocked-badge-SieyhEKk.js";import"./selectable-icon-C0_RVada.js";import"./hover-expand-button-DFy0fF1F.js";import"./index-Bu73OCiD.js";import"./data-refresh-0hU1h1DL.js";import"./rotate-ccw-CUPV0tHU.js";import"./play-4gZlrizf.js";import"./square-terminal-DpT8p3NZ.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-C-W6zJpF.js";import"./spinner-DltMt5f5.js";import"./task-route-D70_7rUP.js";import"./use-api-data-CD_W2LMq.js";import"./useQuery-PdxylXov.js";import"./presentation-DIydnSZd.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
