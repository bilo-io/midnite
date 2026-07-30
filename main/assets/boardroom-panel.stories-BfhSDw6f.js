import{aX as T}from"./iframe-BdzmXRBy.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CndZJJRz.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Dof9r0oM.js";import"./Select-ef7c0426.esm-Bov4ErP-.js";import"./chevron-down-DdnTuzaW.js";import"./check-COfd7Wv3.js";import"./project-tag-CyiT5ZB1.js";import"./project-modal-DnvfbH55.js";import"./export-menu-DZ0d2eXU.js";import"./client-C_bwRotb.js";import"./markdown-preview-DEfZmOWX.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CktG4LVx.js";import"./copy-Bc0QYBAM.js";import"./file-code-corner-BRsXyLcf.js";import"./loader-circle-Dao5Mlb7.js";import"./api-lqNS4KSy.js";import"./folder-open-C2QedANQ.js";import"./folder-Dev4FzW_.js";import"./tag-color-picker-Bn2oUrQt.js";import"./sparkles-DZsuFmpA.js";import"./brain-BE90fXeg.js";import"./chevron-right-D2XpZ68c.js";import"./markdown-editor-DAMWbE0v.js";import"./pencil-_m7qiXDO.js";import"./trash-2-CLs8-wth.js";import"./confirm-dialog-mwNV7fcb.js";import"./index-D7W3CuZ6.js";import"./triangle-alert-BogSl4AC.js";import"./templates-Bv957Djx.js";import"./plus-D78sG67W.js";import"./task-row-BbCcg1br.js";import"./blocked-badge-CjwIR66k.js";import"./selectable-icon-DYktgI8S.js";import"./hover-expand-button-DG_QHLW3.js";import"./index-CYvqPcas.js";import"./data-refresh-CjqJc5-k.js";import"./rotate-ccw-ClNwogRZ.js";import"./play-CzFVinvr.js";import"./square-terminal-BGTzPd6m.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-mFZKZRSG.js";import"./spinner-DX7IM2rr.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BDYdCWB7.js";import"./useQuery-BOe505yN.js";import"./presentation-BRJFsOYL.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const kt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,kt as __namedExportsOrder,Dt as default};
