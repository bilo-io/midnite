import{aX as T}from"./iframe-CZIOcK-E.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-B5ZYx-iY.js";import"./preload-helper-Dp1pzeXC.js";import"./index-u5iYJcov.js";import"./Select-ef7c0426.esm-DwAAHodu.js";import"./chevron-down-Bn3DVHuY.js";import"./check-B603_-5_.js";import"./project-tag-DsTmsJdJ.js";import"./project-modal-CE2iIBH8.js";import"./export-menu-BDQAAbAM.js";import"./client-DtkuwTas.js";import"./markdown-preview-DMDQXI-W.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Vi-Qqswt.js";import"./copy-DR305u27.js";import"./file-code-corner-CsY-XRRv.js";import"./loader-circle-DLmvzyIH.js";import"./api-CRizjhHp.js";import"./folder-open-tNN0Uhtc.js";import"./folder-BlzLyBtw.js";import"./tag-color-picker-Bqd9Ux3C.js";import"./sparkles-CHUgrZco.js";import"./brain-Cf-YN3TK.js";import"./chevron-right-BAN8tShw.js";import"./markdown-editor-B_ZGRU1s.js";import"./pencil-DTwlOyDG.js";import"./trash-2-CqQT_z4P.js";import"./confirm-dialog-CRICraNB.js";import"./index-fLlqtUR0.js";import"./triangle-alert-DLIYGbNm.js";import"./templates-CcaIohfQ.js";import"./plus-BbdTBblM.js";import"./task-row-DRRsJgq_.js";import"./i18n-labels-BrZI42-6.js";import"./selectable-icon-D7GVWSbh.js";import"./hover-expand-button-ZLCbH688.js";import"./index-zsl3eOeJ.js";import"./data-refresh-BLL7oLQA.js";import"./rotate-ccw-C3w-cjqP.js";import"./play-H9uSF4GL.js";import"./square-terminal-8bh_IS5a.js";import"./task-columns-BUR8DOSo.js";import"./spinner-CiuzC6-S.js";import"./task-route-D70_7rUP.js";import"./use-api-data-C7n1TqlD.js";import"./useQuery-CmNdUAX0.js";import"./presentation-1DYloNHy.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
