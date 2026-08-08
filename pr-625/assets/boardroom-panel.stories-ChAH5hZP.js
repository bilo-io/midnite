import{b0 as T}from"./iframe-CRXPy4mK.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D7eiAXMX.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DCHV2XZ2.js";import"./Select-ef7c0426.esm-CAHlbNH0.js";import"./chevron-down-CZEjkYQ1.js";import"./check-CJ1US0TT.js";import"./project-tag-BZipbSgb.js";import"./project-modal-CYn0cptf.js";import"./export-menu-Ck46XV_q.js";import"./client-BXYXff3S.js";import"./markdown-preview-DhHj4cqA.js";import"./index.dom-D_wTd2ti.js";import"./copy-DF536MPF.js";import"./file-code-corner-COvPaHxr.js";import"./file-text-B1V6xtjj.js";import"./loader-circle-MsRqPN08.js";import"./api-Cd0ChvyG.js";import"./folder-open-DnOo4Opg.js";import"./folder-KqJTGehu.js";import"./tag-color-picker-Z3kMLBB1.js";import"./sparkles-DUvT82jw.js";import"./brain-BOtLSn3A.js";import"./chevron-right-TLfUgB1u.js";import"./markdown-editor-DeTfIZNl.js";import"./pencil-D_W3-Ab7.js";import"./trash-2-Czq1aK-G.js";import"./confirm-dialog-C96sdBcZ.js";import"./templates-B3PyxJDc.js";import"./project-template-labels-CbFUS6Fa.js";import"./plus-64fnLCjH.js";import"./task-row-C3mGHA6j.js";import"./blocked-badge-ClTJDnFR.js";import"./selectable-icon-Dtu3m7L0.js";import"./hover-expand-button-2oBs0WrE.js";import"./index-Df-IyFO7.js";import"./data-refresh-DLiCeTBe.js";import"./rotate-ccw-DYrxNrDu.js";import"./play-DJlY5JIS.js";import"./square-terminal-3T6TzPwA.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DCzNeFS4.js";import"./spinner-Da_8PdhZ.js";import"./task-route-D70_7rUP.js";import"./use-api-data-WOjqkT9y.js";import"./useQuery-B7CRXqut.js";import"./presentation-CCiMD18c.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
