import{aW as T}from"./iframe-C6UFZr0b.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DEE8yPA5.js";import"./preload-helper-Dp1pzeXC.js";import"./index-VDKNBmoa.js";import"./Select-ef7c0426.esm-BqAouf7W.js";import"./chevron-down-CppOQx_2.js";import"./check-BUARzPLU.js";import"./project-tag-BNJToQQ-.js";import"./project-modal-DIMEd4B6.js";import"./export-menu-pMc4dBU5.js";import"./client-BepQ5kaJ.js";import"./markdown-preview-DFxp14XT.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Cm4ts-XU.js";import"./copy-BB67k9oE.js";import"./file-code-corner-CTdSQikk.js";import"./loader-circle-BOkR5uL0.js";import"./api-DQUn0wv8.js";import"./folder-open-C8KKVJvx.js";import"./folder-BllIYcgQ.js";import"./tag-color-picker-DUnzhteo.js";import"./sparkles-b3thR40K.js";import"./brain-CBehdFya.js";import"./chevron-right-Dz7cmyl8.js";import"./markdown-editor-BasdcKuK.js";import"./pencil-18_301Wq.js";import"./trash-2-BL5BHS5K.js";import"./confirm-dialog-BhhE2HKP.js";import"./index-t1WZ-VJa.js";import"./triangle-alert-tWojPxK-.js";import"./templates-B6M1OYb3.js";import"./plus-tM0ed4Mx.js";import"./task-row-Do7qITXT.js";import"./i18n-labels-ANgwLTNM.js";import"./selectable-icon-BmHKCCgW.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Dbxox1fI.js";import"./arrow-left-azDcDiK0.js";import"./spinner-BfX1ZDik.js";import"./task-route-D70_7rUP.js";import"./data-refresh-tMS8LEEi.js";import"./use-api-data-VBWMbTGI.js";import"./useQuery-CBQsbxe3.js";import"./presentation-Be-XzBn3.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
