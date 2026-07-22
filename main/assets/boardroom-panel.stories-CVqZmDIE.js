import{aX as T}from"./iframe-DYd4tQ-K.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BHQwr4Jp.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C7_w9-Gf.js";import"./Select-ef7c0426.esm-BRVOOb_6.js";import"./chevron-down-7HRJVTuR.js";import"./check-CMPJiPCH.js";import"./project-tag-Byq7qYjP.js";import"./project-modal-BE8_baZg.js";import"./export-menu-wfNO7jt4.js";import"./client-CSHYi4S0.js";import"./markdown-preview-CYur4nq-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BzxmGvQQ.js";import"./copy-Cj0Mx2OK.js";import"./file-code-corner-DCwVbqMh.js";import"./loader-circle-BxXmPTmg.js";import"./api-DKQXGSRn.js";import"./folder-open-CDLZNn07.js";import"./folder-BkkidNGl.js";import"./tag-color-picker-C6T4pfhB.js";import"./sparkles-DzjniP1G.js";import"./brain-sE2Hz2rt.js";import"./chevron-right-D8Nsx3cI.js";import"./markdown-editor-DRrxkzqL.js";import"./pencil-CGRTQhjE.js";import"./trash-2-Bzvpfhfk.js";import"./confirm-dialog-BLaqBrA-.js";import"./index-CF0ymApV.js";import"./triangle-alert-DdljjaSB.js";import"./templates-B6M1OYb3.js";import"./plus-DYRjzwld.js";import"./task-row--5SiofJw.js";import"./blocked-badge-D8LggqK3.js";import"./selectable-icon-AykQ8QAe.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BLL3swRY.js";import"./arrow-left-BWCP9Pp4.js";import"./spinner-D20g52XA.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BY85WPbV.js";import"./use-api-data-q72Nduit.js";import"./useQuery-Ct-A95N9.js";import"./presentation-Dpmu_MAl.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
