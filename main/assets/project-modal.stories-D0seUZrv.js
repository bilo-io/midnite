import{aX as n,ax as R}from"./iframe-BlOxJO6F.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-B0eDajQi.js";import{P as H}from"./project-modal-CFZj7UkK.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DXmRVUYO.js";import"./Select-ef7c0426.esm-BaRWKZ8E.js";import"./chevron-down-20bha-r_.js";import"./check-irjg0bGT.js";import"./index-BaWyXp7d.js";import"./triangle-alert-B1jl38Ri.js";import"./export-menu-lCAruYUl.js";import"./client-DxvNJe05.js";import"./markdown-preview--wW9z_a-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BQ0IjrdY.js";import"./copy-D9LR3uqz.js";import"./file-code-corner-C3PJurTr.js";import"./loader-circle-54mp3fFZ.js";import"./api-DAduwjXk.js";import"./folder-open-CezmuM-g.js";import"./folder-CLDfl1Vj.js";import"./tag-color-picker-CAbHCm_f.js";import"./project-tag-BgnnNA93.js";import"./sparkles-U2ZUCs_Z.js";import"./brain-ZbC2sIrN.js";import"./chevron-right-CD-qPZTc.js";import"./markdown-editor-HxBAWRCA.js";import"./pencil-C7FCSRci.js";import"./trash-2-rSSq1ir7.js";import"./templates-B6M1OYb3.js";import"./plus-B4q8dM4m.js";import"./task-row-DIGcAK7A.js";import"./blocked-badge-Bh2_EEYM.js";import"./selectable-icon-BOYur1Sw.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CMgFeL_x.js";import"./arrow-left-Mk3Sqj4m.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
