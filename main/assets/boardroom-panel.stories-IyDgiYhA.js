import{l as T}from"./iframe-CwktqEBX.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D0C6orI8.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BDiFekjL.js";import"./index-DTBfnkv9.js";import"./Select-ef7c0426.esm-DDDnBsy0.js";import"./chevron-down-DGQAhRwB.js";import"./check-BNxS9ALI.js";import"./project-tag-xXy7Qo_c.js";import"./site-links-pM9JTGsI.js";import"./project-modal-CoNQYncU.js";import"./export-menu-CxyjSe4T.js";import"./client-BoXXc-4F.js";import"./markdown-preview-BX2GUibj.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CHrc0aYJ.js";import"./copy-DrLYlzjQ.js";import"./file-code-corner-WbFJqC6Q.js";import"./loader-circle-vviNHE4K.js";import"./api-Dm0saTli.js";import"./folder-open-Ckcc_o16.js";import"./folder-DfKFUaoM.js";import"./tag-color-picker-2xs2ob87.js";import"./sparkles-qSEwrMhh.js";import"./brain-DsrP8ng_.js";import"./chevron-right-DpZAYAp8.js";import"./markdown-editor-vy2-McYa.js";import"./pencil-BLPsRn6j.js";import"./trash-2-BFO3eg7p.js";import"./confirm-dialog-1gchad-V.js";import"./triangle-alert-HLCF9Dyy.js";import"./templates-B6M1OYb3.js";import"./plus-JpK97ifT.js";import"./task-row-CabQuexv.js";import"./blocked-badge-DIKQ7W2A.js";import"./selectable-icon-CEkDGkcF.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CNqjunyA.js";import"./arrow-left-BBAa_eGU.js";import"./spinner-DkrNjQ7n.js";import"./task-route-D70_7rUP.js";import"./data-refresh-D0GsfUO0.js";import"./use-api-data-DTM_n_yH.js";import"./useQuery-BPkVrmyN.js";import"./presentation-DGXlZX8v.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Tt as __namedExportsOrder,Bt as default};
