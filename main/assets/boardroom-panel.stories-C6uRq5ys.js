import{aX as T}from"./iframe-C1xKAh6G.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D_swAm-d.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BsItoPXa.js";import"./Select-ef7c0426.esm-DOAILYgh.js";import"./chevron-down-C0yxmy7H.js";import"./check-BHnZF4Ef.js";import"./project-tag-CIV2GW02.js";import"./project-modal-VHP-2UuV.js";import"./export-menu-Q3Kv1yLe.js";import"./client-Dn3LFpEx.js";import"./markdown-preview-CS4mTBEJ.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Bo9tkEv6.js";import"./copy-CWFeyMF4.js";import"./file-code-corner-YoyKqZNF.js";import"./loader-circle-CP2YA7Ws.js";import"./api-DzVl6W5C.js";import"./folder-open-DLWqTfgF.js";import"./folder-BvMV8zi2.js";import"./tag-color-picker-C8OeVq92.js";import"./sparkles-Dmw6Ptgw.js";import"./brain-Bip79pGA.js";import"./chevron-right-Cm_7JBLB.js";import"./markdown-editor-BYP_is-E.js";import"./pencil-CzEC3Ofn.js";import"./trash-2-B3kNWTeZ.js";import"./confirm-dialog-CQRT3_ft.js";import"./index-svdokauc.js";import"./triangle-alert-BoMKMwyc.js";import"./templates-B6M1OYb3.js";import"./plus-CepO0YzL.js";import"./task-row-Cf-55oNS.js";import"./blocked-badge-lKYfq1Eu.js";import"./selectable-icon-4aClfnkw.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DQ2wO8Mg.js";import"./arrow-left-DIGbr_T3.js";import"./spinner-BWSEwim6.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DHsMo2Ip.js";import"./use-api-data-DXFnV4if.js";import"./useQuery-7YjoObot.js";import"./presentation-D8xiKytv.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
