import{aX as T}from"./iframe-ByN9EClQ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-XFXiBGrk.js";import"./preload-helper-Dp1pzeXC.js";import"./index-B4Z8mP3K.js";import"./Select-ef7c0426.esm-TFcYJMxq.js";import"./chevron-down-BkYnRd5m.js";import"./check-D4mqTvyl.js";import"./project-tag-UenHxiL9.js";import"./project-modal-CcKEHnaU.js";import"./export-menu-B0eLtIVo.js";import"./client-BtlnkjFV.js";import"./markdown-preview-BwtsQyNJ.js";import"./index.dom-D_wTd2ti.js";import"./file-text--JCHO2ez.js";import"./copy-BYKUayBV.js";import"./file-code-corner-B0zYrgf7.js";import"./loader-circle-BL9cqPDg.js";import"./api-COdt9z0r.js";import"./folder-open-BNMUbAMr.js";import"./folder-CDD3_aVm.js";import"./tag-color-picker-P_9f3LVG.js";import"./sparkles-CMW_WfyR.js";import"./brain-B0xg8y02.js";import"./chevron-right-B0ju2n4Y.js";import"./markdown-editor-DrRCgTH2.js";import"./pencil-CPikJx0m.js";import"./trash-2-BePOsIZO.js";import"./confirm-dialog-Ci2apHnr.js";import"./index-DVlI8oyz.js";import"./triangle-alert-Cugmi4Sl.js";import"./templates-DaPnG-YN.js";import"./plus-DHGFAEGx.js";import"./task-row-Bruija2q.js";import"./blocked-badge-Cz7bCxJe.js";import"./selectable-icon-WIKtmkVX.js";import"./hover-expand-button-BnycxJPD.js";import"./index-Cq6zmYYR.js";import"./data-refresh-CDi4iB4U.js";import"./rotate-ccw-CHSjHbeA.js";import"./play-COjv3NV9.js";import"./square-terminal-D6U9pSr8.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DEznfR11.js";import"./spinner-Dp5DEgVa.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DIOPQeyF.js";import"./useQuery-BrAOrpJr.js";import"./presentation-DE4k9czf.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
