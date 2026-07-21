import{l as T}from"./iframe-mYbb-MFG.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-FBq58B-s.js";import"./preload-helper-Dp1pzeXC.js";import"./index-D8ZLGl48.js";import"./index-QsD7yz9r.js";import"./Select-ef7c0426.esm-DFRwqb-J.js";import"./chevron-down-CkQ0GFy0.js";import"./check-BZo3CYeU.js";import"./project-tag-CJ1IDfyH.js";import"./site-links-CKmuqtlB.js";import"./project-modal-D-Da7Hud.js";import"./export-menu-Czww--tt.js";import"./client-B757axlP.js";import"./markdown-preview-AmAeKAJP.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CYDQyojq.js";import"./copy-D70a9juo.js";import"./file-code-corner-nUOMzFfR.js";import"./loader-circle-D7uSSvOY.js";import"./api-CqA4DGzK.js";import"./folder-open-BZnbbJCu.js";import"./folder-FYqkxb4P.js";import"./tag-color-picker-DPCS2KLF.js";import"./sparkles-C_tyxr89.js";import"./brain-bGsAVueH.js";import"./chevron-right-DZe4h-TB.js";import"./markdown-editor-_nU1V70D.js";import"./pencil-CFC34DDo.js";import"./trash-2-DljjE1Df.js";import"./confirm-dialog-DbBGTf0b.js";import"./triangle-alert-o8rsyd7F.js";import"./templates-B6M1OYb3.js";import"./plus-DDq2PCaF.js";import"./task-row-DVnpfvb6.js";import"./blocked-badge-DVpMERny.js";import"./selectable-icon-DYuPmh8a.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-FKXu5Q_m.js";import"./arrow-left-NS0g-2A2.js";import"./spinner-C8AAaoJf.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DsGzPOmL.js";import"./use-api-data-BJA60ca1.js";import"./useQuery-DfBTRzKE.js";import"./presentation-CONGyD9l.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
