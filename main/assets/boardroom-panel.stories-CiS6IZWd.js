import{aX as T}from"./iframe-C5IvU1p1.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BcEtOpk6.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BWUNGluS.js";import"./Select-ef7c0426.esm-BftuGcL6.js";import"./chevron-down-B-GNMi22.js";import"./check-BV27VTuU.js";import"./project-tag-ksAQ5PaK.js";import"./project-modal-jsfScPdR.js";import"./export-menu-DGCotwVV.js";import"./client-DzYxjV8s.js";import"./markdown-preview-B35wWWgm.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CNtU1sQK.js";import"./copy-BH8C-Oj7.js";import"./file-code-corner-BpNJ3oc_.js";import"./loader-circle-Ct20B8y5.js";import"./api-CfohCiYb.js";import"./folder-open-DemtPO30.js";import"./folder-CJH84kAJ.js";import"./tag-color-picker-Vkmwj9d4.js";import"./sparkles-DU5uM2QL.js";import"./brain-fGemkI0d.js";import"./chevron-right-BmuFWNV_.js";import"./markdown-editor-WHqJBsXH.js";import"./pencil-LyDfMwEz.js";import"./trash-2-BmU29nzS.js";import"./confirm-dialog-Bm1ZpN-p.js";import"./index-BfYv_0Xi.js";import"./triangle-alert-CsnLWcqb.js";import"./templates-DAeGdhQj.js";import"./plus-B3vlPcWY.js";import"./task-row-DjsPbJr4.js";import"./i18n-labels-vuqO959G.js";import"./selectable-icon-krdfnaWi.js";import"./hover-expand-button-7qb9JSa7.js";import"./index-DN42q_Re.js";import"./data-refresh-B_Lj1ANM.js";import"./rotate-ccw-BvM3ZJeX.js";import"./play-JMDe0oFH.js";import"./square-terminal-B_7zlaeU.js";import"./task-columns-BUR8DOSo.js";import"./spinner-D4qaIhLt.js";import"./task-route-D70_7rUP.js";import"./use-api-data-FMyh6rYL.js";import"./useQuery-52kzO7XZ.js";import"./presentation-C4l8LCpR.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
