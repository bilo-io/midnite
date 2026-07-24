import{aU as T}from"./iframe-Dsltkvs3.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DDkfftbD.js";import"./preload-helper-Dp1pzeXC.js";import"./index-B8E8wWvh.js";import"./Select-ef7c0426.esm-BnGF8zU-.js";import"./chevron-down-C63ojM_J.js";import"./check-CY3ftrD6.js";import"./project-tag-CRvxBWGL.js";import"./project-modal-DzF33OV5.js";import"./export-menu-B0gWFdrA.js";import"./client-QmeLzpKP.js";import"./markdown-preview-D1YfiefG.js";import"./index.dom-D_wTd2ti.js";import"./file-text-0s1hMkFv.js";import"./copy-BbJ-DWl5.js";import"./file-code-corner-C9h91soi.js";import"./loader-circle-D9qRi1hF.js";import"./api-Cq_H79ki.js";import"./folder-open-6D6STPKG.js";import"./folder-Cp5fnYra.js";import"./tag-color-picker-Buhp7e_a.js";import"./sparkles-DIxTHwR7.js";import"./brain-CN8yIV2F.js";import"./chevron-right-IX3xPGlp.js";import"./markdown-editor-DuewC3Ou.js";import"./pencil-CFoNw8y4.js";import"./trash-2-C6ZkE7lv.js";import"./confirm-dialog-DuvnjxDn.js";import"./index-BlWyggYW.js";import"./triangle-alert-DCkc1mJC.js";import"./templates-B6M1OYb3.js";import"./plus-BD5kzRgN.js";import"./task-row-g3YArqW7.js";import"./i18n-labels-DGKO4UU1.js";import"./selectable-icon-Bs4xeoyN.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C79x6Mum.js";import"./arrow-left-CvOUWq2M.js";import"./spinner-CuzI8jju.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DHjz5owL.js";import"./use-api-data-DXds7Mpl.js";import"./useQuery-DaoRTrZN.js";import"./presentation-ItKoW5Py.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
