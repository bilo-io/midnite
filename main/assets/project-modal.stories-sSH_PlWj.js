import{a$ as n,aw as R}from"./iframe-ErTqIs5U.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-zWZSPvac.js";import{P as H}from"./project-modal-dxinKn8p.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BJ3wPdfM.js";import"./Select-ef7c0426.esm-CkdW5jqN.js";import"./chevron-down-CFlz4HBc.js";import"./check-xaBTdq-C.js";import"./export-menu-BCGl2j0F.js";import"./client-CJ5qswQ4.js";import"./markdown-preview-BkOXDLaG.js";import"./index.dom-D_wTd2ti.js";import"./copy-1W8UYqmj.js";import"./file-code-corner-kNGyAvc2.js";import"./file-text-C2_AQRj8.js";import"./loader-circle-B0ZlQW99.js";import"./api-BcTsSGyT.js";import"./folder-open-D8kEXUUb.js";import"./folder-DvyCrgOI.js";import"./tag-color-picker-lE05ov7Y.js";import"./project-tag-DyO1DsGm.js";import"./sparkles-Bs_Uezhr.js";import"./brain-JNWYFu_E.js";import"./chevron-right-C6NvYeDq.js";import"./markdown-editor-KUlqZpuZ.js";import"./pencil-CndWqWTm.js";import"./trash-2--9fOkH16.js";import"./templates-CNWN9IRo.js";import"./project-template-labels-D5s-k5Qh.js";import"./plus-DE9RjYsL.js";import"./task-row--gcUryNY.js";import"./blocked-badge-CjuwAqve.js";import"./selectable-icon-B5ldu_5B.js";import"./hover-expand-button-BUZO7nI4.js";import"./index-D-OJsRsV.js";import"./data-refresh-3f4t7aCn.js";import"./rotate-ccw-BTOc1Eu3.js";import"./play-Bwl8WY5m.js";import"./square-terminal-D1w8WVoI.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-BhhnjMAw.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
