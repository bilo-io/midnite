import{aX as T}from"./iframe-B6JycjIP.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CPqgAvyx.js";import"./preload-helper-Dp1pzeXC.js";import"./index--bblQbMJ.js";import"./Select-ef7c0426.esm-Cv1GNIBD.js";import"./chevron-down-BE683142.js";import"./check-BogCZ8oE.js";import"./project-tag-CoE7d5Vj.js";import"./project-modal-CqjTeMK6.js";import"./export-menu-GXXjfN9O.js";import"./client-BjCgbRuu.js";import"./markdown-preview-Dfn0Vjef.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Ces9nTW_.js";import"./copy-x-VQ2hLE.js";import"./file-code-corner-jChUjc5K.js";import"./loader-circle-D9qsKS18.js";import"./api-Mo0ti7FN.js";import"./folder-open-DxRWeZHW.js";import"./folder-Bi2brAuj.js";import"./tag-color-picker-h9loLEU0.js";import"./sparkles-Cw4QB1j6.js";import"./brain-D5pOjzPh.js";import"./chevron-right-CFKFQPjb.js";import"./markdown-editor-B2i-nGx-.js";import"./pencil-DrRwdSzk.js";import"./trash-2-C4IgDxP3.js";import"./confirm-dialog-Ds2wUhST.js";import"./index-C42ps96z.js";import"./triangle-alert-EvlYdDBe.js";import"./templates-B6M1OYb3.js";import"./plus-C3C0p77M.js";import"./task-row-C8Io_5yr.js";import"./blocked-badge-DWmBpRJO.js";import"./selectable-icon-DJrOEJOE.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CC8gOmAn.js";import"./arrow-left-DH2sLriL.js";import"./spinner-CDyie4-e.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DkV8AnrW.js";import"./use-api-data-Cz7bplFM.js";import"./useQuery-Pyhd4hZK.js";import"./presentation-D52oyAhc.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
