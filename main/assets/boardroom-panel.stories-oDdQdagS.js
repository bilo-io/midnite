import{b0 as T}from"./iframe-gFgXxWaR.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Biyjl1Zt.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DNy2oEqD.js";import"./Select-ef7c0426.esm-CW9LmHfL.js";import"./chevron-down-Bps-R00h.js";import"./check-Dpc0Y1hE.js";import"./project-tag-D4rhD1m3.js";import"./project-modal-B_LLO1kl.js";import"./export-menu-AM3OCjm1.js";import"./client-Be_Arjw1.js";import"./markdown-preview-Cbi0ainU.js";import"./index.dom-D_wTd2ti.js";import"./copy-DY-TYTg9.js";import"./file-code-corner-Ca5uBXJK.js";import"./file-text-B4Y8SpDf.js";import"./loader-circle-tHDlx3pq.js";import"./api-DttCPlos.js";import"./folder-open-BvAocLf9.js";import"./folder-9iRFSHhi.js";import"./tag-color-picker-B-9PyFtu.js";import"./sparkles-CwQ2C98J.js";import"./brain-BQTvW0ev.js";import"./chevron-right-C0zxYWyb.js";import"./markdown-editor-Cxvte1s6.js";import"./pencil-7wthU_jO.js";import"./trash-2-CPp24p8X.js";import"./confirm-dialog-CmLhaSr9.js";import"./templates-Dv9Z8i7T.js";import"./project-template-labels-IrNOqv34.js";import"./plus-CN97TpWE.js";import"./task-row-BaKqtjoa.js";import"./blocked-badge-Cr0L0u_X.js";import"./selectable-icon-D8TrI7Tu.js";import"./hover-expand-button-BbOIFyu9.js";import"./index-DKfmD3n_.js";import"./data-refresh-DSFC4rm2.js";import"./rotate-ccw-xEIiEQxg.js";import"./play-CkXwrFZB.js";import"./square-terminal-Db8tvKjj.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-l1Kfggq6.js";import"./spinner-BNoQybyN.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BpphB17z.js";import"./useQuery-CXMPNVVB.js";import"./presentation-CQ91TYe8.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
