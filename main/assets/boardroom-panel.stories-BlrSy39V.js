import{aX as T}from"./iframe-Ndp7Z41n.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D_3LayYf.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BvhSjJmi.js";import"./Select-ef7c0426.esm-BOuFyUvH.js";import"./chevron-down-BrtTEcXN.js";import"./check-Beq0GxkD.js";import"./project-tag-mSFq3JN3.js";import"./project-modal-rxX-BwlN.js";import"./export-menu-BnWP9u1y.js";import"./client-u3r2EJPd.js";import"./markdown-preview-BPdJcnJN.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DZNkotun.js";import"./copy-RbderPvR.js";import"./file-code-corner-BLW4QfW1.js";import"./loader-circle-BwhD6OY3.js";import"./api-DWLhwH10.js";import"./folder-open-CsOSCAy9.js";import"./folder-Bo4fDsDk.js";import"./tag-color-picker-Ytds410o.js";import"./sparkles-uYXmJ_aW.js";import"./brain-C1qI-g0c.js";import"./chevron-right-CR3LWOQy.js";import"./markdown-editor-DJf5FC8M.js";import"./pencil-Yrxpvgzl.js";import"./trash-2-BO4UVOpE.js";import"./confirm-dialog-B9cSWN2v.js";import"./index-CRVaz7o8.js";import"./triangle-alert-DSTl3iqW.js";import"./templates-Da031t7k.js";import"./plus-u32g_-1W.js";import"./task-row-DrZJC0aA.js";import"./i18n-labels-DaO6AUvz.js";import"./selectable-icon-CFwB_qsQ.js";import"./hover-expand-button-DqTLpJ9R.js";import"./index-UcOX2ZB7.js";import"./data-refresh-Czrgs2Vd.js";import"./rotate-ccw-DLvyg66r.js";import"./play-CrqB-JSx.js";import"./square-terminal-DdpGVVec.js";import"./task-columns-BUR8DOSo.js";import"./spinner-64_7TRpq.js";import"./task-route-D70_7rUP.js";import"./use-api-data-CuW4bveQ.js";import"./useQuery-CMZVykQk.js";import"./presentation-CxRFlRME.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
