import{aX as T}from"./iframe-m6LxmOl4.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Cn5TXAyC.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BjYWb-vJ.js";import"./Select-ef7c0426.esm-Ds5oCQuR.js";import"./chevron-down--ZER32Sl.js";import"./check-CnhC3lf0.js";import"./project-tag-C6PNqJjm.js";import"./project-modal-0c3JvjRs.js";import"./export-menu-9lBRh3TX.js";import"./client-wWu2-AsR.js";import"./markdown-preview-1rQ3uFy2.js";import"./index.dom-D_wTd2ti.js";import"./file-text-jRlV8PqN.js";import"./copy-AyZ8Wtsw.js";import"./file-code-corner-CmUg2_Vn.js";import"./loader-circle-C3vOxjqu.js";import"./api-Pon48YGm.js";import"./folder-open-CWyDh4KV.js";import"./folder-D0v1tJkm.js";import"./tag-color-picker-D-Q_GpsR.js";import"./sparkles-qLPw7OUE.js";import"./brain-CsHo7Ggc.js";import"./chevron-right-CgIiwCgh.js";import"./markdown-editor-CHTBt7OV.js";import"./pencil-D29wMapI.js";import"./trash-2-BFhVZfie.js";import"./confirm-dialog-Cexrc6H6.js";import"./index-Cas0pP7u.js";import"./triangle-alert-B6UYXHQe.js";import"./templates-TT3GQL4p.js";import"./plus-Czh99KxO.js";import"./task-row-CefHvhhQ.js";import"./i18n-labels-C9TO6gK-.js";import"./selectable-icon-C8_th9Ot.js";import"./hover-expand-button-DJubVFDJ.js";import"./index-hgvSfPIs.js";import"./data-refresh-C9u1dPOD.js";import"./rotate-ccw-Cu9UBdN4.js";import"./play-CYDOpAje.js";import"./square-terminal-BclU37ox.js";import"./task-columns-BUR8DOSo.js";import"./spinner-BXsOH5nc.js";import"./task-route-D70_7rUP.js";import"./use-api-data-Dy8Sx5CK.js";import"./useQuery-BNva9yuI.js";import"./presentation-DMNJN_-Y.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
